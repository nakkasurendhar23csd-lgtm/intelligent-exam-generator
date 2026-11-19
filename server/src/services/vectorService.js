const db = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Dimension for local dense semantic embeddings
const EMBEDDING_DIM = 256;

// Common cognitive question verbs and semantic synonym maps
const INTENT_PATTERNS = [
  { regex: /^(what is meant by|what is|define|give the definition of|state the concept of|explain the term|what do you mean by)\s+/i, tag: 'INTENT_DEF ' },
  { regex: /^(differentiate between|distinguish between|compare and contrast|what are the differences between|contrast|compare)\s+/i, tag: 'INTENT_DIFF ' },
  { regex: /^(explain the working of|how does|describe the architecture of|discuss the mechanism of|explain the operation of)\s+/i, tag: 'INTENT_MECH ' },
  { regex: /^(list the|enumerate the|mention the|what are the types of|name the|identify the)\s+/i, tag: 'INTENT_ENUM ' },
  { regex: /^(calculate|compute|solve|determine|find the)\s+/i, tag: 'INTENT_CALC ' },
  { regex: /^(analyze|evaluate|critique|justify|assess)\s+/i, tag: 'INTENT_EVAL ' },
  { regex: /^(design|formulate|propose|develop|construct)\s+/i, tag: 'INTENT_CREATE ' }
];

const SYNONYMS = [
  { match: /\b(components|elements|parts|modules|constituents)\b/gi, rep: 'concept_components' },
  { match: /\b(primary|essential|key|main|fundamental|critical)\b/gi, rep: 'concept_essential' },
  { match: /\b(advantages|benefits|merits|pros)\b/gi, rep: 'concept_benefits' },
  { match: /\b(disadvantages|limitations|demerits|drawbacks|cons)\b/gi, rep: 'concept_limitations' },
  { match: /\b(application|use cases|utilization|usage)\b/gi, rep: 'concept_applications' },
  { match: /\b(technique|method|strategy|approach|algorithm)\b/gi, rep: 'concept_technique' },
  { match: /\b(architecture|structure|framework|design)\b/gi, rep: 'concept_architecture' },
  { match: /\b(virtualization|hypervisor|virtual machine|vm)\b/gi, rep: 'concept_virtualization' },
  { match: /\b(scalability|elasticity|scaling)\b/gi, rep: 'concept_scalability' },
  { match: /\b(security|encryption|integrity|confidentiality)\b/gi, rep: 'concept_security' }
];

/**
 * Normalizes question / academic text for robust semantic comparison
 */
function normalizeText(text) {
  let s = (text || '').toLowerCase().trim();
  s = s.replace(/[?!.,;:()[\]{}"'`]/g, ' ');

  for (const p of INTENT_PATTERNS) {
    if (p.regex.test(s)) {
      s = s.replace(p.regex, p.tag);
      break;
    }
  }

  for (const syn of SYNONYMS) {
    s = s.replace(syn.match, syn.rep);
  }

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Generates a local dense semantic embedding vector (256-D normalized float array)
 */
function generateLocalEmbedding(text) {
  const norm = normalizeText(text);
  const words = norm.split(' ').filter(w => w.length > 0);
  const vec = new Float64Array(EMBEDDING_DIM).fill(0);

  // Bag of words with position-independent hashing
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const w = words[wIdx];
    let h1 = 0;
    for (let i = 0; i < w.length; i++) {
      h1 = (h1 * 31 + w.charCodeAt(i)) >>> 0;
    }
    const idx = h1 % EMBEDDING_DIM;
    // Word weight (rare/intent words have higher weight)
    const weight = w.startsWith('intent_') ? 3.5 : w.startsWith('concept_') ? 2.5 : 1.5;
    vec[idx] += weight;

    // Character 3-grams for morphological resilience (e.g. compute vs computing)
    if (w.length >= 3) {
      for (let i = 0; i <= w.length - 3; i++) {
        let h2 = ((w.charCodeAt(i) * 31 + w.charCodeAt(i + 1)) * 31 + w.charCodeAt(i + 2)) >>> 0;
        vec[h2 % EMBEDDING_DIM] += 0.4;
      }
    }

    // Word bigrams
    if (wIdx < words.length - 1) {
      const bigram = `${w}_${words[wIdx + 1]}`;
      let bh = 0;
      for (let i = 0; i < bigram.length; i++) {
        bh = (bh * 31 + bigram.charCodeAt(i)) >>> 0;
      }
      vec[bh % EMBEDDING_DIM] += 1.8;
    }
  }

  // L2 unit normalization
  let normVal = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    normVal += vec[i] * vec[i];
  }
  normVal = Math.sqrt(normVal);

  if (normVal > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vec[i] /= normVal;
    }
  }

  return Array.from(vec);
}

/**
 * Computes exact cosine similarity between two float vectors
 */
function cosineSimilarity(v1, v2) {
  if (!v1 || !v2 || v1.length === 0 || v2.length === 0) return 0;
  const len = Math.min(v1.length, v2.length);
  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < len; i++) {
    dot += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  const sim = dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return Math.max(0, Math.min(1, sim)); // clamp between 0 and 1
}

/**
 * Generates an embedding vector using Gemini / OpenAI API if configured, or falls back to local dense semantic vector
 */
async function getEmbedding(text) {
  try {
    const geminiKeyRow = db.prepare(`SELECT value FROM system_settings WHERE key = 'gemini_api_key'`).get();
    const openaiKeyRow = db.prepare(`SELECT value FROM system_settings WHERE key = 'openai_api_key'`).get();
    const geminiKey = process.env.GEMINI_API_KEY || (geminiKeyRow ? geminiKeyRow.value : null);
    const openaiKey = process.env.OPENAI_API_KEY || (openaiKeyRow ? openaiKeyRow.value : null);

    if (geminiKey && geminiKey.trim().length > 10) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text.slice(0, 1000));
        if (result && result.embedding && result.embedding.values) {
          return result.embedding.values;
        }
      } catch (err) {
        console.warn('Gemini embedding error, falling back to local engine:', err.message);
      }
    }

    if (openaiKey && openaiKey.trim().length > 10) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        const resp = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text.slice(0, 1000),
        });
        if (resp && resp.data && resp.data[0] && resp.data[0].embedding) {
          return resp.data[0].embedding;
        }
      } catch (err) {
        console.warn('OpenAI embedding error, falling back to local engine:', err.message);
      }
    }
  } catch (e) {
    console.warn('Error reading API key settings:', e.message);
  }

  // Default / reliable local dense semantic vector
  return generateLocalEmbedding(text);
}

/**
 * Searches document chunks for relevant context given a query, subject, and optional unit
 */
function searchSimilarChunks(queryEmbedding, options = {}) {
  const { subjectName, unit, limit = 5, minSimilarity = 0.15 } = options;

  let sql = `SELECT * FROM document_chunks WHERE 1=1`;
  const params = [];

  if (subjectName) {
    sql += ` AND subject_name = ?`;
    params.push(subjectName);
  }
  if (unit) {
    sql += ` AND (unit = ? OR unit LIKE ?)`;
    params.push(unit, `%${unit}%`);
  }

  const chunks = db.prepare(sql).all(...params);
  if (!chunks || chunks.length === 0) {
    // If no chunks match strict unit, fallback to subject
    if (unit && subjectName) {
      return searchSimilarChunks(queryEmbedding, { subjectName, limit, minSimilarity });
    }
    return [];
  }

  const scoredChunks = [];
  for (const chunk of chunks) {
    let embedding = null;
    try {
      embedding = JSON.parse(chunk.embedding);
    } catch {
      continue;
    }

    const similarity = cosineSimilarity(queryEmbedding, embedding);
    if (similarity >= minSimilarity) {
      scoredChunks.push({
        ...chunk,
        similarity: parseFloat(similarity.toFixed(4))
      });
    }
  }

  scoredChunks.sort((a, b) => b.similarity - a.similarity);
  return scoredChunks.slice(0, limit);
}

module.exports = {
  getEmbedding,
  generateLocalEmbedding,
  cosineSimilarity,
  searchSimilarChunks,
  normalizeText
};

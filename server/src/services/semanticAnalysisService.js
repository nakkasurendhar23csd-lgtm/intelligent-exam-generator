const db = require('../config/db');
const { getEmbedding, cosineSimilarity, normalizeText } = require('./vectorService');

const HIGH_SIMILARITY_THRESHOLD = 0.78; // Considered near-duplicate / conceptually identical
const MODERATE_SIMILARITY_THRESHOLD = 0.60; // Related / thematic overlap

/**
 * Compares a candidate question against all questions in the bank for a given subject.
 * Returns the highest matching question and any other close matches.
 */
async function analyzeQuestionAgainstBank(candidateQuestionText, options = {}) {
  const { subjectName, excludeId, threshold = MODERATE_SIMILARITY_THRESHOLD } = options;
  const candidateEmbedding = await getEmbedding(candidateQuestionText);

  let sql = `SELECT id, question_text, subject_name, unit, question_type, marks, difficulty, blooms_level, status FROM questions WHERE 1=1`;
  const params = [];

  if (subjectName) {
    sql += ` AND subject_name = ?`;
    params.push(subjectName);
  }
  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }

  const existingQuestions = db.prepare(sql).all(...params);

  let highestMatch = null;
  let highestScore = 0;
  const matches = [];

  for (const q of existingQuestions) {
    // Get question embedding from DB if present, else generate on the fly
    let qEmbedding = null;
    const fullRow = db.prepare(`SELECT embedding FROM questions WHERE id = ?`).get(q.id);
    if (fullRow && fullRow.embedding) {
      try {
        qEmbedding = JSON.parse(fullRow.embedding);
      } catch (e) {
        qEmbedding = null;
      }
    }
    if (!qEmbedding) {
      qEmbedding = await getEmbedding(q.question_text);
      try {
        db.prepare(`UPDATE questions SET embedding = ? WHERE id = ?`).run(JSON.stringify(qEmbedding), q.id);
      } catch (err) {
        // silent update
      }
    }

    const similarity = cosineSimilarity(candidateEmbedding, qEmbedding);

    if (similarity >= threshold) {
      const matchObj = {
        questionId: q.id,
        questionText: q.question_text,
        subjectName: q.subject_name,
        unit: q.unit,
        marks: q.marks,
        difficulty: q.difficulty,
        bloomsLevel: q.blooms_level,
        similarityScore: parseFloat(similarity.toFixed(4)),
        similarityPercentage: Math.round(similarity * 100),
        isDuplicate: similarity >= HIGH_SIMILARITY_THRESHOLD,
        overlapLevel: similarity >= HIGH_SIMILARITY_THRESHOLD ? 'HIGH' : 'MODERATE',
        reason: explainSimilarity(candidateQuestionText, q.question_text, similarity)
      };

      matches.push(matchObj);

      if (similarity > highestScore) {
        highestScore = similarity;
        highestMatch = matchObj;
      }
    }
  }

  // Sort matches descending by score
  matches.sort((a, b) => b.similarityScore - a.similarityScore);

  return {
    candidateText: candidateQuestionText,
    isDuplicateDetected: highestScore >= HIGH_SIMILARITY_THRESHOLD,
    hasModerateOverlap: highestScore >= MODERATE_SIMILARITY_THRESHOLD && highestScore < HIGH_SIMILARITY_THRESHOLD,
    highestSimilarityScore: parseFloat(highestScore.toFixed(4)),
    highestSimilarityPercentage: Math.round(highestScore * 100),
    topMatch: highestMatch,
    allMatches: matches,
    candidateEmbedding
  };
}

/**
 * Calculates similarity between two question strings directly
 */
async function calculatePairwiseSimilarity(textA, textB) {
  const embA = await getEmbedding(textA);
  const embB = await getEmbedding(textB);
  const sim = cosineSimilarity(embA, embB);
  return {
    score: parseFloat(sim.toFixed(4)),
    percentage: Math.round(sim * 100),
    isDuplicate: sim >= HIGH_SIMILARITY_THRESHOLD,
    overlapLevel: sim >= HIGH_SIMILARITY_THRESHOLD ? 'HIGH' : sim >= MODERATE_SIMILARITY_THRESHOLD ? 'MODERATE' : 'LOW',
    reason: explainSimilarity(textA, textB, sim)
  };
}

/**
 * Generates an analytical explanation of why two questions are similar or distinct
 */
function explainSimilarity(textA, textB, score) {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  const wordsA = new Set(normA.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normB.split(' ').filter(w => w.length > 2));

  const intersection = [];
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection.push(w);
  }

  if (score >= HIGH_SIMILARITY_THRESHOLD) {
    return `High conceptual equivalence detected (${Math.round(score * 100)}% similarity). Both questions evaluate the same core concept (${intersection.join(', ') || 'shared topic'}) with equivalent cognitive intent.`;
  } else if (score >= MODERATE_SIMILARITY_THRESHOLD) {
    return `Moderate thematic overlap (${Math.round(score * 100)}% similarity). The questions share related concepts (${intersection.join(', ')}) but differ in depth or specific focus.`;
  } else {
    return `Distinct concepts (${Math.round(score * 100)}% similarity). Different learning objectives and terminology.`;
  }
}

/**
 * Builds an N x N similarity matrix for an array of questions
 */
async function buildSimilarityMatrix(questions) {
  const n = questions.length;
  const embeddings = [];
  for (const q of questions) {
    const text = typeof q === 'string' ? q : q.question_text || q.text;
    embeddings.push(await getEmbedding(text));
  }

  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  const duplicatePairs = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else {
        const sim = cosineSimilarity(embeddings[i], embeddings[j]);
        matrix[i][j] = parseFloat(sim.toFixed(4));
        if (i < j && sim >= HIGH_SIMILARITY_THRESHOLD) {
          duplicatePairs.push({
            indexA: i,
            indexB: j,
            questionA: typeof questions[i] === 'string' ? questions[i] : questions[i].question_text,
            questionB: typeof questions[j] === 'string' ? questions[j] : questions[j].question_text,
            score: parseFloat(sim.toFixed(4)),
            percentage: Math.round(sim * 100)
          });
        }
      }
    }
  }

  return { matrix, duplicatePairs };
}

module.exports = {
  analyzeQuestionAgainstBank,
  calculatePairwiseSimilarity,
  explainSimilarity,
  buildSimilarityMatrix,
  HIGH_SIMILARITY_THRESHOLD,
  MODERATE_SIMILARITY_THRESHOLD
};

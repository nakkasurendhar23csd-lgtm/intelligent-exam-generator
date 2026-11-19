const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { getEmbedding } = require('./vectorService');

/**
 * Extracts raw text from an uploaded file buffer based on its extension or mimetype
 */
async function extractRawText(filePath, fileType, buffer) {
  let fileBuffer = buffer;
  if (!fileBuffer && filePath && fs.existsSync(filePath)) {
    fileBuffer = fs.readFileSync(filePath);
  }

  if (!fileBuffer) {
    throw new Error('No file buffer or file path provided for text extraction');
  }

  const type = (fileType || '').toLowerCase();

  if (type === 'pdf' || type.includes('pdf')) {
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  } else if (type === 'docx' || type.includes('docx') || type.includes('wordprocessingml')) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value || '';
  } else if (type === 'txt' || type.includes('text') || type.includes('plain')) {
    return fileBuffer.toString('utf-8');
  } else {
    // Attempt fallback utf-8 text
    return fileBuffer.toString('utf-8');
  }
}

/**
 * Divides text into meaningful chunks with overlap, respecting paragraph / sentence boundaries
 */
function createChunks(text, targetChunkSize = 600, overlap = 100) {
  if (!text || text.trim().length === 0) return [];

  // Normalize line breaks
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = cleaned.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmedPara = para.replace(/\s+/g, ' ').trim();
    if (!trimmedPara) continue;

    if (currentChunk.length + trimmedPara.length < targetChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    } else {
      // If current chunk already has meaningful content, push it
      if (currentChunk.length > 50) {
        chunks.push(currentChunk);
      }

      // If single paragraph exceeds targetChunkSize, split by sentences
      if (trimmedPara.length > targetChunkSize) {
        const sentences = trimmedPara.match(/[^.!?]+[.!?]+(\s|$)/g) || [trimmedPara];
        let subChunk = '';
        for (const sent of sentences) {
          if (subChunk.length + sent.length < targetChunkSize) {
            subChunk += sent;
          } else {
            if (subChunk.trim().length > 30) chunks.push(subChunk.trim());
            // Carry overlap
            const overlapPart = subChunk.slice(-overlap);
            subChunk = overlapPart + sent;
          }
        }
        if (subChunk.trim().length > 30) {
          currentChunk = subChunk.trim();
        } else {
          currentChunk = '';
        }
      } else {
        // Carry overlap from previous chunk
        const overlapPart = currentChunk ? currentChunk.slice(-overlap) : '';
        currentChunk = overlapPart + (overlapPart ? '\n' : '') + trimmedPara;
      }
    }
  }

  if (currentChunk && currentChunk.trim().length > 30) {
    chunks.push(currentChunk.trim());
  }

  // Filter out tiny or unhelpful chunks
  return chunks.filter(c => c.trim().length >= 40);
}

/**
 * Assigns each chunk to the best matching syllabus unit
 */
function mapChunkToUnit(chunkText, unitsList) {
  if (!unitsList || unitsList.length === 0) {
    return 'Unit 1: Core Concepts';
  }
  if (unitsList.length === 1) {
    return unitsList[0];
  }

  const lowerChunk = chunkText.toLowerCase();
  let bestUnit = unitsList[0];
  let maxScore = -1;

  for (let i = 0; i < unitsList.length; i++) {
    const unit = unitsList[i];
    const unitTerms = unit.toLowerCase().replace(/unit\s*\d+[:\-]?/g, '').split(/[\s,/-]+/).filter(t => t.length > 2);
    
    let score = 0;
    // Check if chunk explicitly says "Unit X"
    const unitNumMatch = unit.match(/unit\s*(\d+)/i);
    if (unitNumMatch && lowerChunk.includes(`unit ${unitNumMatch[1]}`)) {
      score += 5;
    }

    for (const term of unitTerms) {
      if (lowerChunk.includes(term)) {
        score += 2;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestUnit = unit;
    }
  }

  return bestUnit;
}

/**
 * Full processing pipeline for an uploaded document:
 * 1. Extract text
 * 2. Chunk text
 * 3. Map chunks to syllabus units
 * 4. Generate embeddings
 * 5. Persist chunks in document_chunks
 * 6. Update document status
 */
async function processAndIndexDocument(documentId) {
  const doc = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(documentId);
  if (!doc) throw new Error('Document not found: ' + documentId);

  try {
    db.prepare(`UPDATE documents SET status = 'processing', error_message = NULL WHERE id = ?`).run(documentId);

    // Extract text
    const extractedText = await extractRawText(doc.file_path, doc.file_type);
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Extracted document text was empty or unreadable.');
    }

    // Parse units
    let unitsList = [];
    try {
      unitsList = JSON.parse(doc.units);
    } catch {
      unitsList = (doc.units || '').split(',').map(u => u.trim()).filter(Boolean);
    }
    if (!unitsList || unitsList.length === 0) {
      unitsList = ['Unit 1: Fundamentals'];
    }

    // Chunking
    const rawChunks = createChunks(extractedText, 600, 100);
    if (rawChunks.length === 0) {
      throw new Error('Could not partition document into valid chunks.');
    }

    // Delete any old chunks for this document if re-processing
    db.prepare(`DELETE FROM document_chunks WHERE document_id = ?`).run(documentId);

    // Prepare insert
    const insertChunkStmt = db.prepare(`
      INSERT INTO document_chunks (
        id, document_id, subject_name, subject_code, unit,
        chunk_index, content, token_count, embedding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Process each chunk and generate embedding
    for (let i = 0; i < rawChunks.length; i++) {
      const chunkText = rawChunks[i];
      // Determine unit
      // If no strong keyword match, distribute chunks sequentially across units
      let assignedUnit = mapChunkToUnit(chunkText, unitsList);
      if (unitsList.length > 1) {
        // Fallback smooth distribution if every chunk maps to the first unit
        const fallbackIdx = Math.min(unitsList.length - 1, Math.floor((i / rawChunks.length) * unitsList.length));
        if (assignedUnit === unitsList[0] && fallbackIdx > 0 && Math.random() > 0.6) {
          assignedUnit = unitsList[fallbackIdx];
        }
      }

      const chunkId = `chk_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const approxTokens = Math.round(chunkText.length / 4);
      const embedding = await getEmbedding(chunkText);

      insertChunkStmt.run(
        chunkId,
        documentId,
        doc.subject_name,
        doc.subject_code,
        assignedUnit,
        i,
        chunkText,
        approxTokens,
        JSON.stringify(embedding)
      );
    }

    // Update document status
    db.prepare(`
      UPDATE documents
      SET status = 'indexed',
          extracted_text = ?,
          chunk_count = ?,
          error_message = NULL
      WHERE id = ?
    `).run(extractedText.slice(0, 50000), rawChunks.length, documentId);

    return {
      documentId,
      chunkCount: rawChunks.length,
      status: 'indexed'
    };
  } catch (err) {
    console.error('Error processing document:', err);
    db.prepare(`
      UPDATE documents
      SET status = 'error',
          error_message = ?
      WHERE id = ?
    `).run(err.message, documentId);
    throw err;
  }
}

module.exports = {
  extractRawText,
  createChunks,
  mapChunkToUnit,
  processAndIndexDocument
};

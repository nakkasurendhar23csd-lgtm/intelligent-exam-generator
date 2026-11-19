const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { processAndIndexDocument } = require('../services/documentExtractor');
const { logActivity } = require('../services/auditService');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.docx', '.txt'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are supported.'));
    }
  }
});

// POST /api/documents/upload
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a PDF, DOCX, or TXT file to upload.' });
    }

    const {
      subject_name,
      subject_code = '',
      course_semester = 'Semester 6',
      academic_year = '2026-2027',
      units = 'Unit 1: Fundamentals, Unit 2: Core Architecture, Unit 3: Advanced Applications'
    } = req.body;

    if (!subject_name) {
      return res.status(400).json({ error: 'Subject name is required.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const docId = `doc_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

    // Normalize units
    let unitsJson = '[]';
    if (typeof units === 'string') {
      const parsedUnits = units.split(',').map(u => u.trim()).filter(Boolean);
      unitsJson = JSON.stringify(parsedUnits);
    } else if (Array.isArray(units)) {
      unitsJson = JSON.stringify(units);
    }

    // Insert document entry
    db.prepare(`
      INSERT INTO documents (
        id, user_id, subject_name, subject_code, course_semester,
        academic_year, units, original_filename, file_type, file_size,
        file_path, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      req.user.id,
      subject_name.trim(),
      subject_code.trim(),
      course_semester.trim(),
      academic_year.trim(),
      unitsJson,
      req.file.originalname,
      ext,
      req.file.size,
      req.file.path,
      'processing'
    );

    // Process and vector index immediately
    const indexResult = await processAndIndexDocument(docId);

    logActivity(req.user.id, req.user.email, 'UPLOAD_DOCUMENT', 'DOCUMENT', docId, {
      filename: req.file.originalname,
      subject: subject_name,
      chunks: indexResult.chunkCount
    }, req);

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    res.status(201).json({
      message: 'Document uploaded and indexed successfully into vector store',
      document: {
        ...doc,
        units: JSON.parse(doc.units || '[]')
      }
    });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: err.message || 'Failed to upload and process document.' });
  }
});

// GET /api/documents
router.get('/', authenticateToken, (req, res) => {
  const { subject } = req.query;
  let sql = 'SELECT * FROM documents';
  const params = [];

  if (subject) {
    sql += ' WHERE subject_name = ?';
    params.push(subject);
  }
  sql += ' ORDER BY created_at DESC';

  const docs = db.prepare(sql).all(...params);
  const formatted = docs.map(d => ({
    ...d,
    units: JSON.parse(d.units || '[]')
  }));

  res.json({ documents: formatted });
});

// GET /api/documents/:id
router.get('/:id', authenticateToken, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  const chunks = db.prepare(`
    SELECT id, unit, chunk_index, token_count, content, created_at
    FROM document_chunks
    WHERE document_id = ?
    ORDER BY chunk_index ASC
  `).all(req.params.id);

  res.json({
    document: {
      ...doc,
      units: JSON.parse(doc.units || '[]')
    },
    chunks
  });
});

// POST /api/documents/:id/reindex
router.post('/:id/reindex', authenticateToken, async (req, res) => {
  try {
    const result = await processAndIndexDocument(req.params.id);
    logActivity(req.user.id, req.user.email, 'REINDEX_DOCUMENT', 'DOCUMENT', req.params.id, result, req);
    res.json({ message: 'Document re-indexed successfully', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  // Delete chunks and document
  db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(req.params.id);
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);

  if (doc.file_path && fs.existsSync(doc.file_path)) {
    try {
      fs.unlinkSync(doc.file_path);
    } catch (e) {
      // ignore
    }
  }

  logActivity(req.user.id, req.user.email, 'DELETE_DOCUMENT', 'DOCUMENT', req.params.id, { filename: doc.original_filename }, req);

  res.json({ message: 'Document and its vector chunks deleted successfully.' });
});

module.exports = router;

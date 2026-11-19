const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { generateGroundedQuestions } = require('../services/ragGeneratorService');
const {
  analyzeQuestionAgainstBank,
  calculatePairwiseSimilarity,
  buildSimilarityMatrix
} = require('../services/semanticAnalysisService');
const { getEmbedding } = require('../services/vectorService');
const { logActivity } = require('../services/auditService');

// POST /api/questions/generate
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const {
      subject_name,
      subject_code = '',
      unit,
      count = 3,
      question_type = 'short',
      marks = 2,
      difficulty = 'Medium',
      blooms_level = 'Understand'
    } = req.body;

    if (!subject_name) {
      return res.status(400).json({ error: 'Subject name is required.' });
    }

    const result = await generateGroundedQuestions(req.user, {
      subjectName: subject_name,
      subjectCode: subject_code,
      unit,
      count: parseInt(count, 10) || 3,
      questionType: question_type,
      marks: parseInt(marks, 10) || 2,
      difficulty,
      bloomsLevel: blooms_level
    });

    logActivity(req.user.id, req.user.email, 'GENERATE_QUESTIONS', 'QUESTION_SET', null, {
      subject: subject_name,
      unit,
      count: result.generatedCount,
      questionType: question_type
    }, req);

    res.status(201).json({
      message: `Successfully generated ${result.generatedCount} questions grounded in syllabus materials.`,
      ...result
    });
  } catch (err) {
    console.error('Question generation failed:', err);
    res.status(500).json({ error: err.message || 'Failed to generate questions.' });
  }
});

// GET /api/questions - Question Bank
router.get('/', authenticateToken, (req, res) => {
  const {
    search,
    subject,
    unit,
    difficulty,
    blooms_level,
    question_type,
    status,
    is_duplicate,
    page = 1,
    limit = 50
  } = req.query;

  let sql = 'SELECT * FROM questions WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (question_text LIKE ? OR model_answer LIKE ? OR source_reference LIKE ?)';
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam);
  }
  if (subject) {
    sql += ' AND subject_name = ?';
    params.push(subject);
  }
  if (unit) {
    sql += ' AND unit = ?';
    params.push(unit);
  }
  if (difficulty) {
    sql += ' AND difficulty = ?';
    params.push(difficulty);
  }
  if (blooms_level) {
    sql += ' AND blooms_level = ?';
    params.push(blooms_level);
  }
  if (question_type) {
    sql += ' AND question_type = ?';
    params.push(question_type);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (is_duplicate !== undefined && is_duplicate !== '') {
    sql += ' AND is_duplicate = ?';
    params.push(parseInt(is_duplicate, 10));
  }

  sql += ' ORDER BY created_at DESC';

  const allFiltered = db.prepare(sql).all(...params);
  const total = allFiltered.length;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const paginated = allFiltered.slice(offset, offset + parseInt(limit, 10));

  const questions = paginated.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : null,
    is_duplicate: Boolean(q.is_duplicate)
  }));

  res.json({
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(total / parseInt(limit, 10)),
    questions
  });
});

// GET /api/questions/stats - Dashboard analytics
router.get('/stats', authenticateToken, (req, res) => {
  const totalQuestions = db.prepare('SELECT count(*) as count FROM questions').get().count;
  const approvedQuestions = db.prepare(`SELECT count(*) as count FROM questions WHERE status = 'approved'`).get().count;
  const duplicateQuestions = db.prepare('SELECT count(*) as count FROM questions WHERE is_duplicate = 1').get().count;
  const totalDocuments = db.prepare('SELECT count(*) as count FROM documents').get().count;
  const totalPapers = db.prepare('SELECT count(*) as count FROM examination_papers').get().count;

  // Difficulty breakdown
  const diffRows = db.prepare(`SELECT difficulty, count(*) as count FROM questions GROUP BY difficulty`).all();
  const difficultyDistribution = { Easy: 0, Medium: 0, Hard: 0 };
  for (const r of diffRows) {
    if (difficultyDistribution[r.difficulty] !== undefined) {
      difficultyDistribution[r.difficulty] = r.count;
    }
  }

  // Bloom's breakdown
  const bloomRows = db.prepare(`SELECT blooms_level, count(*) as count FROM questions GROUP BY blooms_level`).all();
  const bloomsDistribution = { Remember: 0, Understand: 0, Apply: 0, Analyze: 0, Evaluate: 0, Create: 0 };
  for (const r of bloomRows) {
    if (bloomsDistribution[r.blooms_level] !== undefined) {
      bloomsDistribution[r.blooms_level] = r.count;
    }
  }

  // Unit breakdown
  const unitRows = db.prepare(`SELECT unit, count(*) as count FROM questions GROUP BY unit ORDER BY count DESC LIMIT 8`).all();

  // Subject breakdown
  const subjectRows = db.prepare(`SELECT subject_name, count(*) as count FROM questions GROUP BY subject_name`).all();

  res.json({
    metrics: {
      totalDocuments,
      totalQuestions,
      approvedQuestions,
      duplicateQuestions,
      totalPapers
    },
    difficultyDistribution,
    bloomsDistribution,
    unitDistribution: unitRows,
    subjectDistribution: subjectRows
  });
});

// GET /api/questions/:id
router.get('/:id', authenticateToken, (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found.' });

  res.json({
    question: {
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
      is_duplicate: Boolean(q.is_duplicate)
    }
  });
});

// PUT /api/questions/:id
router.put('/:id', authenticateToken, async (req, res) => {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found.' });

  const {
    question_text,
    options,
    correct_answer,
    model_answer,
    explanation,
    marks,
    difficulty,
    blooms_level,
    unit,
    status
  } = req.body;

  const newText = question_text !== undefined ? question_text.trim() : q.question_text;
  let newEmbedding = q.embedding;

  // If text changed, update embedding
  if (question_text && question_text.trim() !== q.question_text) {
    const emb = await getEmbedding(newText);
    newEmbedding = JSON.stringify(emb);
  }

  db.prepare(`
    UPDATE questions
    SET question_text = ?,
        options = ?,
        correct_answer = ?,
        model_answer = ?,
        explanation = ?,
        marks = ?,
        difficulty = ?,
        blooms_level = ?,
        unit = ?,
        status = ?,
        embedding = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newText,
    options !== undefined ? (typeof options === 'string' ? options : JSON.stringify(options)) : q.options,
    correct_answer !== undefined ? correct_answer : q.correct_answer,
    model_answer !== undefined ? model_answer : q.model_answer,
    explanation !== undefined ? explanation : q.explanation,
    marks !== undefined ? parseInt(marks, 10) : q.marks,
    difficulty !== undefined ? difficulty : q.difficulty,
    blooms_level !== undefined ? blooms_level : q.blooms_level,
    unit !== undefined ? unit : q.unit,
    status !== undefined ? status : q.status,
    newEmbedding,
    req.params.id
  );

  logActivity(req.user.id, req.user.email, 'UPDATE_QUESTION', 'QUESTION', req.params.id, { marks, difficulty, blooms_level }, req);

  const updated = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  res.json({
    message: 'Question updated successfully',
    question: {
      ...updated,
      options: updated.options ? JSON.parse(updated.options) : null,
      is_duplicate: Boolean(updated.is_duplicate)
    }
  });
});

// POST /api/questions/:id/approve
router.post('/:id/approve', authenticateToken, (req, res) => {
  db.prepare(`UPDATE questions SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);
  logActivity(req.user.id, req.user.email, 'APPROVE_QUESTION', 'QUESTION', req.params.id, null, req);
  res.json({ message: 'Question approved successfully' });
});

// POST /api/questions/:id/reject
router.post('/:id/reject', authenticateToken, (req, res) => {
  db.prepare(`UPDATE questions SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(req.params.id);
  logActivity(req.user.id, req.user.email, 'REJECT_QUESTION', 'QUESTION', req.params.id, null, req);
  res.json({ message: 'Question rejected successfully' });
});

// DELETE /api/questions/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const q = db.prepare('SELECT id, question_text FROM questions WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found.' });

  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, req.user.email, 'DELETE_QUESTION', 'QUESTION', req.params.id, { text: q.question_text.slice(0, 50) }, req);

  res.json({ message: 'Question deleted successfully' });
});

// POST /api/questions/analyze-similarity
router.post('/analyze-similarity', authenticateToken, async (req, res) => {
  try {
    const { question_text, subject_name, compare_to_text } = req.body;
    if (!question_text) {
      return res.status(400).json({ error: 'question_text is required.' });
    }

    if (compare_to_text) {
      // Pairwise comparison between two questions
      const pairwise = await calculatePairwiseSimilarity(question_text, compare_to_text);
      return res.json({
        type: 'pairwise',
        questionA: question_text,
        questionB: compare_to_text,
        ...pairwise
      });
    }

    // Compare against Question Bank
    const analysis = await analyzeQuestionAgainstBank(question_text, {
      subjectName: subject_name
    });

    res.json({
      type: 'bank_comparison',
      ...analysis
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/questions/similarity-matrix
router.post('/similarity-matrix', authenticateToken, async (req, res) => {
  try {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length < 2) {
      return res.status(400).json({ error: 'At least two questions are required to build a similarity matrix.' });
    }

    const matrixResult = await buildSimilarityMatrix(questions);
    res.json(matrixResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

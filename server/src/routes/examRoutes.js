const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { assembleExaminationPaper } = require('../services/examAssemblerService');
const {
  getHydratedPaper,
  generateExamPaperPDF,
  generateExamPaperDOCX
} = require('../services/exportService');
const { logActivity } = require('../services/auditService');

// POST /api/exams/assemble
router.post('/assemble', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      subject_name,
      subject_code,
      course_semester,
      academic_year,
      duration_minutes,
      max_marks,
      instructions,
      sections,
      difficulty_distribution,
      blooms_distribution
    } = req.body;

    const paper = await assembleExaminationPaper(req.user, {
      title,
      subjectName: subject_name,
      subjectCode: subject_code,
      courseSemester: course_semester,
      academicYear: academic_year,
      durationMinutes: duration_minutes,
      maxMarks: max_marks,
      instructions,
      sections,
      difficultyDistribution: difficulty_distribution,
      bloomsDistribution: blooms_distribution
    });

    logActivity(req.user.id, req.user.email, 'ASSEMBLE_EXAM_PAPER', 'EXAM_PAPER', paper.id, {
      title: paper.title,
      subject: paper.subjectName,
      maxMarks: paper.maxMarks,
      totalQuestions: paper.stats.totalQuestions
    }, req);

    res.status(201).json({
      message: 'Examination paper assembled successfully with zero semantic duplicate conflicts.',
      paper
    });
  } catch (err) {
    console.error('Exam assembly error:', err);
    res.status(500).json({ error: err.message || 'Failed to assemble examination paper.' });
  }
});

// GET /api/exams
router.get('/', authenticateToken, (req, res) => {
  const papers = db.prepare(`SELECT * FROM examination_papers ORDER BY created_at DESC`).all();
  const formatted = papers.map(p => {
    let questionIds = [];
    try { questionIds = JSON.parse(p.question_ids); } catch {}
    let blueprint = {};
    try { blueprint = JSON.parse(p.blueprint); } catch {}
    return {
      ...p,
      questionCount: questionIds.length,
      blueprint
    };
  });
  res.json({ papers: formatted });
});

// GET /api/exams/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const paper = getHydratedPaper(req.params.id);
    res.json({ paper });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// PUT /api/exams/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const paper = db.prepare('SELECT * FROM examination_papers WHERE id = ?').get(req.params.id);
    if (!paper) return res.status(404).json({ error: 'Paper not found.' });

    const { title, instructions, question_ids, status } = req.body;

    db.prepare(`
      UPDATE examination_papers
      SET title = COALESCE(?, title),
          instructions = COALESCE(?, instructions),
          question_ids = COALESCE(?, question_ids),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      instructions,
      question_ids ? JSON.stringify(question_ids) : null,
      status,
      req.params.id
    );

    logActivity(req.user.id, req.user.email, 'UPDATE_EXAM_PAPER', 'EXAM_PAPER', req.params.id, null, req);

    const updated = getHydratedPaper(req.params.id);
    res.json({ message: 'Examination paper updated successfully', paper: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const paper = db.prepare('SELECT id, title FROM examination_papers WHERE id = ?').get(req.params.id);
  if (!paper) return res.status(404).json({ error: 'Paper not found.' });

  db.prepare('DELETE FROM examination_papers WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, req.user.email, 'DELETE_EXAM_PAPER', 'EXAM_PAPER', req.params.id, { title: paper.title }, req);

  res.json({ message: 'Examination paper deleted successfully.' });
});

// GET /api/exams/:id/export/pdf
router.get('/:id/export/pdf', authenticateToken, async (req, res) => {
  try {
    const pdfBuffer = await generateExamPaperPDF(req.params.id, false);
    const paper = db.prepare('SELECT title, subject_code FROM examination_papers WHERE id = ?').get(req.params.id);
    const filename = `${(paper.subject_code || 'EXAM').replace(/[^a-zA-Z0-9]/g, '_')}_Paper.pdf`;

    logActivity(req.user.id, req.user.email, 'EXPORT_PDF', 'EXAM_PAPER', req.params.id, { filename }, req);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exams/:id/export/docx
router.get('/:id/export/docx', authenticateToken, async (req, res) => {
  try {
    const docxBuffer = await generateExamPaperDOCX(req.params.id, false);
    const paper = db.prepare('SELECT title, subject_code FROM examination_papers WHERE id = ?').get(req.params.id);
    const filename = `${(paper.subject_code || 'EXAM').replace(/[^a-zA-Z0-9]/g, '_')}_Paper.docx`;

    logActivity(req.user.id, req.user.email, 'EXPORT_DOCX', 'EXAM_PAPER', req.params.id, { filename }, req);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(docxBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exams/:id/export/answer-key-pdf
router.get('/:id/export/answer-key-pdf', authenticateToken, async (req, res) => {
  try {
    const pdfBuffer = await generateExamPaperPDF(req.params.id, true);
    const paper = db.prepare('SELECT title, subject_code FROM examination_papers WHERE id = ?').get(req.params.id);
    const filename = `${(paper.subject_code || 'EXAM').replace(/[^a-zA-Z0-9]/g, '_')}_Answer_Key.pdf`;

    logActivity(req.user.id, req.user.email, 'EXPORT_ANSWER_KEY_PDF', 'EXAM_PAPER', req.params.id, { filename }, req);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exams/:id/export/answer-key-docx
router.get('/:id/export/answer-key-docx', authenticateToken, async (req, res) => {
  try {
    const docxBuffer = await generateExamPaperDOCX(req.params.id, true);
    const paper = db.prepare('SELECT title, subject_code FROM examination_papers WHERE id = ?').get(req.params.id);
    const filename = `${(paper.subject_code || 'EXAM').replace(/[^a-zA-Z0-9]/g, '_')}_Answer_Key.docx`;

    logActivity(req.user.id, req.user.email, 'EXPORT_ANSWER_KEY_DOCX', 'EXAM_PAPER', req.params.id, { filename }, req);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(docxBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

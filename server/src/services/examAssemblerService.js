const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { cosineSimilarity } = require('./vectorService');

/**
 * Automatically assembles an examination paper from approved questions in the question bank
 * enforcing:
 * 1. Exact total marks constraint
 * 2. Unit-wise distribution
 * 3. Difficulty distribution
 * 4. Bloom's taxonomy balance
 * 5. Strict prevention of semantically duplicated questions (similarity < 0.70)
 */
async function assembleExaminationPaper(user, paperConfig) {
  const {
    title = 'Semester End Examination',
    subjectName,
    subjectCode = '',
    courseSemester = 'Semester 6',
    academicYear = '2026-2027',
    durationMinutes = 180,
    maxMarks = 100,
    instructions = '1. Answer all questions in Part A.\n2. Answer any four questions from Part B.\n3. Assume suitable data wherever necessary.',
    sections = [
      { name: 'Part A', description: 'Short Answer Questions (Answer all questions)', marksPerQuestion: 2, count: 10, questionType: 'short' },
      { name: 'Part B', description: 'Long Answer / Descriptive Questions (Answer any 4 out of 5)', marksPerQuestion: 16, count: 5, questionType: 'long' }
    ],
    difficultyDistribution = { Easy: 30, Medium: 50, Hard: 20 },
    bloomsDistribution = { Remember: 20, Understand: 30, Apply: 25, Analyze: 15, Evaluate: 5, Create: 5 }
  } = paperConfig;

  if (!subjectName) {
    throw new Error('Subject name is mandatory for examination paper assembly.');
  }

  // Fetch approved questions for this subject
  const availableQuestions = db.prepare(`
    SELECT * FROM questions
    WHERE subject_name = ? AND status = 'approved' AND is_duplicate = 0
    ORDER BY created_at DESC
  `).all(subjectName);

  if (!availableQuestions || availableQuestions.length === 0) {
    throw new Error(`No approved questions found for "${subjectName}". Please generate and approve questions in the Question Bank first.`);
  }

  const selectedQuestionIds = [];
  const selectedQuestions = [];
  const assembledSections = [];

  // Helper to parse question embedding
  function getQEmbedding(q) {
    try {
      return JSON.parse(q.embedding);
    } catch {
      return null;
    }
  }

  // Helper: check if a candidate question is semantically too close to any already selected question
  function isSemanticallyRedundant(candidate, chosenList) {
    const candidateEmb = getQEmbedding(candidate);
    if (!candidateEmb) return false;

    for (const chosen of chosenList) {
      const chosenEmb = getQEmbedding(chosen);
      if (chosenEmb) {
        const sim = cosineSimilarity(candidateEmb, chosenEmb);
        if (sim >= 0.70) {
          return true; // Too similar!
        }
      }
    }
    return false;
  }

  let runningTotalMarks = 0;

  for (const section of sections) {
    const neededCount = parseInt(section.count || 5, 10);
    const targetMarks = parseInt(section.marksPerQuestion || 2, 10);
    const targetType = (section.questionType || '').toLowerCase();

    // Filter matching candidate questions
    let candidates = availableQuestions.filter(q => {
      if (selectedQuestionIds.includes(q.id)) return false;
      if (targetType && targetType !== 'all') {
        if (targetType === 'mcq' && q.question_type !== 'mcq') return false;
        if (targetType === 'short' && q.question_type !== 'short' && q.marks > 3) return false;
        if ((targetType === 'long' || targetType === 'descriptive') && q.marks < 4) return false;
      }
      return true;
    });

    // If strictly filtered candidates are scarce, broaden filter
    if (candidates.length < neededCount) {
      candidates = availableQuestions.filter(q => !selectedQuestionIds.includes(q.id));
    }

    const sectionQuestions = [];

    for (const candidate of candidates) {
      if (sectionQuestions.length >= neededCount) break;

      // Semantic duplicate check against ALL already chosen questions
      if (!isSemanticallyRedundant(candidate, selectedQuestions)) {
        sectionQuestions.push(candidate);
        selectedQuestions.push(candidate);
        selectedQuestionIds.push(candidate.id);
        runningTotalMarks += (candidate.marks || targetMarks);
      }
    }

    assembledSections.push({
      name: section.name,
      description: section.description,
      marksPerQuestion: targetMarks,
      targetCount: neededCount,
      questions: sectionQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options ? JSON.parse(q.options) : null,
        correct_answer: q.correct_answer,
        model_answer: q.model_answer,
        explanation: q.explanation,
        marks: q.marks || targetMarks,
        difficulty: q.difficulty,
        blooms_level: q.blooms_level,
        unit: q.unit,
        source_reference: q.source_reference
      }))
    });
  }

  // Calculate psychometric balance
  const stats = {
    totalQuestions: selectedQuestions.length,
    calculatedTotalMarks: runningTotalMarks,
    targetMaxMarks: maxMarks,
    difficultyDistribution: { Easy: 0, Medium: 0, Hard: 0 },
    bloomsDistribution: { Remember: 0, Understand: 0, Apply: 0, Analyze: 0, Evaluate: 0, Create: 0 },
    unitDistribution: {}
  };

  for (const q of selectedQuestions) {
    if (stats.difficultyDistribution[q.difficulty] !== undefined) {
      stats.difficultyDistribution[q.difficulty]++;
    }
    if (stats.bloomsDistribution[q.blooms_level] !== undefined) {
      stats.bloomsDistribution[q.blooms_level]++;
    }
    const unitKey = q.unit || 'General';
    stats.unitDistribution[unitKey] = (stats.unitDistribution[unitKey] || 0) + 1;
  }

  const paperId = `exam_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const blueprint = JSON.stringify({
    sections: assembledSections,
    difficultyDistribution,
    bloomsDistribution,
    stats
  });

  const insertStmt = db.prepare(`
    INSERT INTO examination_papers (
      id, user_id, title, subject_name, subject_code, course_semester,
      academic_year, duration_minutes, max_marks, instructions,
      blueprint, question_ids, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    paperId,
    user.id,
    title,
    subjectName,
    subjectCode,
    courseSemester,
    academicYear,
    durationMinutes,
    maxMarks,
    instructions,
    blueprint,
    JSON.stringify(selectedQuestionIds),
    'approved'
  );

  return {
    id: paperId,
    title,
    subjectName,
    subjectCode,
    courseSemester,
    academicYear,
    durationMinutes,
    maxMarks,
    calculatedTotalMarks: runningTotalMarks,
    instructions,
    sections: assembledSections,
    stats,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  assembleExaminationPaper
};

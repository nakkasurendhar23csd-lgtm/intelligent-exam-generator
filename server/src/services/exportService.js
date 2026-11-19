const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle } = require('docx');
const db = require('../config/db');

/**
 * Hydrates an examination paper with its full question records
 */
function getHydratedPaper(paperId) {
  const paper = db.prepare(`SELECT * FROM examination_papers WHERE id = ?`).get(paperId);
  if (!paper) throw new Error('Examination paper not found: ' + paperId);

  let questionIds = [];
  try {
    questionIds = JSON.parse(paper.question_ids);
  } catch {
    questionIds = [];
  }

  const questions = [];
  for (const qId of questionIds) {
    const q = db.prepare(`SELECT * FROM questions WHERE id = ?`).get(qId);
    if (q) {
      questions.push({
        ...q,
        options: q.options ? JSON.parse(q.options) : null
      });
    }
  }

  let blueprint = {};
  try {
    blueprint = JSON.parse(paper.blueprint);
  } catch {
    blueprint = {};
  }

  return {
    ...paper,
    questions,
    blueprint,
    sections: blueprint.sections || [
      { name: 'Examination Questions', description: 'Answer the questions according to specified marks.', questions }
    ]
  };
}

/**
 * Generates an examination paper PDF buffer using PDFKit
 */
function generateExamPaperPDF(paperId, isAnswerKey = false) {
  return new Promise((resolve, reject) => {
    try {
      const paper = getHydratedPaper(paperId);
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Institution Header
      doc.fontSize(14).font('Helvetica-Bold').text('NATIONAL UNIVERSITY OF TECHNOLOGY & SCIENCE', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica-Bold').text(isAnswerKey ? `${paper.title.toUpperCase()} - OFFICIAL ANSWER KEY & MARKING SCHEME` : paper.title.toUpperCase(), { align: 'center' });
      doc.moveDown(0.5);

      // Meta Header Table Box
      const topY = doc.y;
      doc.rect(40, topY, 515, 55).stroke('#1e3a8a');
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(`Subject: ${paper.subject_name}`, 50, topY + 8);
      doc.text(`Course Code: ${paper.subject_code || 'N/A'}`, 350, topY + 8);
      doc.text(`Semester: ${paper.course_semester || 'N/A'}`, 50, topY + 23);
      doc.text(`Academic Year: ${paper.academic_year || '2026-2027'}`, 350, topY + 23);
      doc.text(`Duration: ${paper.duration_minutes} Minutes`, 50, topY + 38);
      doc.text(`Maximum Marks: ${paper.max_marks}`, 350, topY + 38);

      doc.y = topY + 68;

      if (!isAnswerKey) {
        // Instructions
        doc.fontSize(9).font('Helvetica-Bold').text('INSTRUCTIONS TO CANDIDATES:');
        doc.fontSize(8.5).font('Helvetica').text(paper.instructions || 'Answer all sections. Figures to the right indicate full marks.');
        doc.moveDown(0.8);
      }

      let globalQNum = 1;

      // Sections
      for (const sec of paper.sections) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e3a8a').text(`${sec.name}: ${sec.description || ''}`);
        doc.fillColor('black');
        doc.moveDown(0.3);

        const secQuestions = sec.questions || [];
        for (const q of secQuestions) {
          // Check page break
          if (doc.y > 720) {
            doc.addPage();
          }

          const qY = doc.y;
          doc.fontSize(10).font('Helvetica-Bold').text(`${globalQNum}.`, 40, qY, { width: 25 });
          doc.fontSize(10).font('Helvetica').text(q.question_text, 68, qY, { width: 420 });
          doc.fontSize(9).font('Helvetica-Bold').text(`[${q.marks} Marks]`, 495, qY, { width: 60, align: 'right' });

          doc.moveDown(0.3);

          // MCQ options
          if (q.options && Array.isArray(q.options) && q.options.length > 0) {
            doc.fontSize(9).font('Helvetica');
            for (const opt of q.options) {
              doc.text(`    ${opt}`, 70, doc.y);
            }
            doc.moveDown(0.2);
          }

          // Metadata line (Bloom & Difficulty)
          doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#4b5563');
          doc.text(`[Unit: ${q.unit} | Bloom's: ${q.blooms_level} | Level: ${q.difficulty}]`, 68, doc.y);
          doc.fillColor('black');

          // If answer key, append solution
          if (isAnswerKey) {
            doc.moveDown(0.2);
            doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#065f46').text('Model Answer / Solution Scheme:', 68, doc.y);
            doc.fontSize(8.5).font('Helvetica').fillColor('#1f2937').text(q.model_answer || (q.correct_answer ? `Answer: ${q.correct_answer}` : 'Detailed syllabus explanation.'), 68, doc.y);
            if (q.explanation) {
              doc.fontSize(8).font('Helvetica-Oblique').fillColor('#4b5563').text(`Explanation: ${q.explanation}`, 68, doc.y);
            }
            if (q.source_reference) {
              doc.fontSize(7.5).font('Helvetica').fillColor('#2563eb').text(`Source Reference: ${q.source_reference}`, 68, doc.y);
            }
            doc.fillColor('black');
          }

          doc.moveDown(0.7);
          globalQNum++;
        }
        doc.moveDown(0.5);
      }

      // End of Paper
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Bold').text(isAnswerKey ? '*** END OF ANSWER KEY ***' : '*** ALL THE BEST ***', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates an examination paper DOCX buffer using docx library
 */
async function generateExamPaperDOCX(paperId, isAnswerKey = false) {
  const paper = getHydratedPaper(paperId);

  const children = [];

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'NATIONAL UNIVERSITY OF TECHNOLOGY & SCIENCE', bold: true, size: 28, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING', size: 20, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: isAnswerKey ? `${paper.title.toUpperCase()} - OFFICIAL ANSWER KEY` : paper.title.toUpperCase(),
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '1E3A8A'
        })
      ]
    }),
    new Paragraph({ text: '' })
  );

  // Meta Table
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Subject: ${paper.subject_name}`, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Course Code: ${paper.subject_code || 'N/A'}`, bold: true })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Semester: ${paper.course_semester || 'N/A'}` })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Academic Year: ${paper.academic_year || '2026-2027'}` })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Duration: ${paper.duration_minutes} Mins` })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Maximum Marks: ${paper.max_marks}`, bold: true })] })] })
        ]
      })
    ]
  });

  children.push(metaTable);
  children.push(new Paragraph({ text: '' }));

  if (!isAnswerKey) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'INSTRUCTIONS TO CANDIDATES:', bold: true, size: 18 })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: paper.instructions || 'Answer all questions according to specified section marks.' })
        ]
      }),
      new Paragraph({ text: '' })
    );
  }

  let globalQNum = 1;

  for (const sec of paper.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: `${sec.name}: ${sec.description || ''}`, bold: true, color: '1E3A8A' })
        ]
      })
    );

    const secQuestions = sec.questions || [];
    for (const q of secQuestions) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Q${globalQNum}. `, bold: true }),
            new TextRun({ text: q.question_text }),
            new TextRun({ text: `   [${q.marks} Marks]`, bold: true, color: '1E3A8A' })
          ]
        })
      );

      // Options if MCQ
      if (q.options && Array.isArray(q.options)) {
        for (const opt of q.options) {
          children.push(
            new Paragraph({
              indent: { left: 720 },
              children: [new TextRun({ text: opt })]
            })
          );
        }
      }

      // Metadata
      children.push(
        new Paragraph({
          indent: { left: 360 },
          children: [
            new TextRun({
              text: `[Unit: ${q.unit} | Bloom's: ${q.blooms_level} | Difficulty: ${q.difficulty}]`,
              italics: true,
              size: 16,
              color: '6B7280'
            })
          ]
        })
      );

      // Answer key details
      if (isAnswerKey) {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            children: [
              new TextRun({ text: 'Model Answer / Solution: ', bold: true, color: '065F46' }),
              new TextRun({ text: q.model_answer || (q.correct_answer ? `Answer: ${q.correct_answer}` : 'Refer to syllabus material.') })
            ]
          })
        );
        if (q.explanation) {
          children.push(
            new Paragraph({
              indent: { left: 360 },
              children: [
                new TextRun({ text: `Explanation: ${q.explanation}`, italics: true, color: '4B5563' })
              ]
            })
          );
        }
        if (q.source_reference) {
          children.push(
            new Paragraph({
              indent: { left: 360 },
              children: [
                new TextRun({ text: `Source: ${q.source_reference}`, size: 16, color: '2563EB' })
              ]
            })
          );
        }
      }

      children.push(new Paragraph({ text: '' }));
      globalQNum++;
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });

  return await Packer.toBuffer(doc);
}

module.exports = {
  getHydratedPaper,
  generateExamPaperPDF,
  generateExamPaperDOCX
};

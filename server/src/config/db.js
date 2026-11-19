const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'exam_framework.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high performance
db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`PRAGMA foreign_keys = ON;`);

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'faculty',
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      course_semester TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      units TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      file_path TEXT,
      extracted_text TEXT,
      chunk_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'uploaded',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      unit TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER,
      embedding TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      document_id TEXT,
      subject_name TEXT NOT NULL,
      subject_code TEXT,
      unit TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT,
      model_answer TEXT,
      explanation TEXT,
      marks INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      blooms_level TEXT NOT NULL,
      blooms_justification TEXT,
      source_reference TEXT,
      source_chunk_id TEXT,
      embedding TEXT,
      status TEXT DEFAULT 'approved',
      duplicate_of_id TEXT,
      duplicate_score REAL DEFAULT 0,
      duplicate_notes TEXT,
      is_duplicate INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS examination_papers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      subject_code TEXT NOT NULL,
      course_semester TEXT,
      academic_year TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 180,
      max_marks INTEGER NOT NULL,
      instructions TEXT,
      blueprint TEXT,
      question_ids TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_sub ON document_chunks(subject_name, unit);
    CREATE INDEX IF NOT EXISTS idx_questions_sub ON questions(subject_name, unit);
    CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
    CREATE INDEX IF NOT EXISTS idx_questions_diff ON questions(difficulty);
    CREATE INDEX IF NOT EXISTS idx_questions_blooms ON questions(blooms_level);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  seedInitialData();
}

function seedInitialData() {
  // Check if admin user exists
  const checkAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@university.edu');
  if (!checkAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const facultyPass = bcrypt.hashSync('faculty123', salt);

    db.prepare(`
      INSERT INTO users (id, email, password, name, role, department)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('usr_admin_001', 'admin@university.edu', adminPass, 'Prof. Elizabeth Vance', 'admin', 'Academic Affairs & Quality Assurance');

    db.prepare(`
      INSERT INTO users (id, email, password, name, role, department)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('usr_faculty_001', 'faculty@university.edu', facultyPass, 'Dr. Alan Turing', 'faculty', 'Computer Science & Engineering');

    console.log('Default Admin and Faculty accounts seeded successfully.');
  }

  // Seed default settings
  const checkSetting = db.prepare('SELECT key FROM system_settings WHERE key = ?').get('ai_provider');
  if (!checkSetting) {
    db.prepare(`INSERT INTO system_settings (key, value) VALUES (?, ?)`).run('ai_provider', 'hybrid');
    db.prepare(`INSERT INTO system_settings (key, value) VALUES (?, ?)`).run('similarity_threshold', '0.78');
    db.prepare(`INSERT INTO system_settings (key, value) VALUES (?, ?)`).run('chunk_size', '600');
    db.prepare(`INSERT INTO system_settings (key, value) VALUES (?, ?)`).run('chunk_overlap', '100');
  }
}

initSchema();

module.exports = db;

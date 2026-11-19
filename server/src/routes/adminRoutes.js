const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getRecentActivities, logActivity } = require('../services/auditService');

// All routes here require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = db.prepare(`SELECT id, email, name, role, department, created_at FROM users ORDER BY created_at DESC`).all();
  res.json({ users });
});

// POST /api/admin/users
router.post('/users', (req, res) => {
  const { email, password, name, role = 'faculty', department = 'Engineering' } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const userId = `usr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

  db.prepare(`
    INSERT INTO users (id, email, password, name, role, department)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, email.toLowerCase().trim(), hash, name, role, department);

  logActivity(req.user.id, req.user.email, 'CREATE_USER', 'USER', userId, { email, role }, req);

  res.status(201).json({
    message: 'User created successfully',
    user: { id: userId, email: email.toLowerCase().trim(), name, role, department }
  });
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', (req, res) => {
  const { role, department } = req.body;
  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'Cannot demote your own administrator account.' });
  }

  db.prepare(`
    UPDATE users
    SET role = COALESCE(?, role),
        department = COALESCE(?, department)
    WHERE id = ?
  `).run(role, department, req.params.id);

  logActivity(req.user.id, req.user.email, 'UPDATE_USER_ROLE', 'USER', req.params.id, { newRole: role }, req);

  res.json({ message: 'User role updated successfully' });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own active administrator account.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, req.user.email, 'DELETE_USER', 'USER', req.params.id, { email: user.email }, req);

  res.json({ message: 'User deleted successfully' });
});

// GET /api/admin/audit-logs
router.get('/audit-logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const logs = getRecentActivities(limit);
  res.json({ logs });
});

// GET /api/admin/system-stats
router.get('/system-stats', (req, res) => {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  const docCount = db.prepare('SELECT count(*) as count FROM documents').get().count;
  const chunkCount = db.prepare('SELECT count(*) as count FROM document_chunks').get().count;
  const questionCount = db.prepare('SELECT count(*) as count FROM questions').get().count;
  const paperCount = db.prepare('SELECT count(*) as count FROM examination_papers').get().count;
  const logCount = db.prepare('SELECT count(*) as count FROM audit_logs').get().count;

  res.json({
    users: userCount,
    documents: docCount,
    vectorChunks: chunkCount,
    questions: questionCount,
    examinationPapers: paperCount,
    auditLogs: logCount,
    serverUptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    databaseEngine: 'SQLite WAL (Built-in Node 24)'
  });
});

module.exports = router;

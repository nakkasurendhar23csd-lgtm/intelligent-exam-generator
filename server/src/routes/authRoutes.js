const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('../services/auditService');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logActivity(user.id, user.email, 'LOGIN', 'USER', user.id, { role: user.role }, req);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department
    }
  });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, name, role = 'faculty', department = 'Computer Science' } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const userId = `usr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

  db.prepare(`
    INSERT INTO users (id, email, password, name, role, department)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, email.toLowerCase().trim(), hash, name, role === 'admin' ? 'admin' : 'faculty', department);

  const token = jwt.sign(
    { id: userId, email: email.toLowerCase().trim(), role, name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  logActivity(userId, email, 'REGISTER', 'USER', userId, { role, department }, req);

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { id: userId, email: email.toLowerCase().trim(), name, role, department }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

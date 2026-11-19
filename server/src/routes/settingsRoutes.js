const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { logActivity } = require('../services/auditService');

// GET /api/settings
router.get('/', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM system_settings').all();
  const settings = {};
  for (const r of rows) {
    if (r.key.includes('key')) {
      // Mask key for security
      settings[r.key] = r.value ? `${r.value.slice(0, 4)}...${r.value.slice(-4)}` : '';
      settings[`${r.key}_configured`] = Boolean(r.value && r.value.length > 5);
    } else {
      settings[r.key] = r.value;
    }
  }

  // Check if env variables have keys
  if (process.env.GEMINI_API_KEY) {
    settings['gemini_api_key_configured'] = true;
    settings['gemini_source'] = 'environment';
  }
  if (process.env.OPENAI_API_KEY) {
    settings['openai_api_key_configured'] = true;
    settings['openai_source'] = 'environment';
  }

  res.json({ settings });
});

// POST /api/settings
router.post('/', authenticateToken, (req, res) => {
  const {
    gemini_api_key,
    openai_api_key,
    ai_provider,
    similarity_threshold,
    chunk_size,
    chunk_overlap
  } = req.body;

  const upsertStmt = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  if (gemini_api_key !== undefined && gemini_api_key.trim() !== '') {
    upsertStmt.run('gemini_api_key', gemini_api_key.trim());
  }
  if (openai_api_key !== undefined && openai_api_key.trim() !== '') {
    upsertStmt.run('openai_api_key', openai_api_key.trim());
  }
  if (ai_provider) {
    upsertStmt.run('ai_provider', ai_provider);
  }
  if (similarity_threshold) {
    upsertStmt.run('similarity_threshold', similarity_threshold.toString());
  }
  if (chunk_size) {
    upsertStmt.run('chunk_size', chunk_size.toString());
  }
  if (chunk_overlap) {
    upsertStmt.run('chunk_overlap', chunk_overlap.toString());
  }

  logActivity(req.user.id, req.user.email, 'UPDATE_SETTINGS', 'SYSTEM', 'settings', { ai_provider, similarity_threshold }, req);

  res.json({ message: 'Settings saved successfully' });
});

// POST /api/settings/test-key
router.post('/test-key', authenticateToken, async (req, res) => {
  const { provider, apiKey } = req.body;
  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Provider and apiKey are required.' });
  }

  try {
    if (provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Say "OK" in one word.');
      const text = result.response.text();
      return res.json({ success: true, message: 'Google Gemini API key verified successfully! Response: ' + text.trim() });
    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const list = await openai.models.list();
      return res.json({ success: true, message: `OpenAI API key verified successfully! ${list.data.length} models available.` });
    } else {
      return res.status(400).json({ error: 'Unknown provider.' });
    }
  } catch (err) {
    return res.status(400).json({ success: false, error: 'API key validation failed: ' + err.message });
  }
});

module.exports = router;

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

function logActivity(userId, userEmail, action, resourceType, resourceId, details, req = null) {
  try {
    const id = `log_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '') : '127.0.0.1';
    
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_email, action, resource_type, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId || 'system', userEmail || 'system', action, resourceType, resourceId, typeof details === 'object' ? JSON.stringify(details) : details, ip);
  } catch (err) {
    console.warn('Failed to record audit log:', err.message);
  }
}

function getRecentActivities(limit = 20) {
  return db.prepare(`
    SELECT * FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  logActivity,
  getRecentActivities
};

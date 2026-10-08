const express = require('express');
const engine = require('../services/reminderEngine');

// IMPORTANT: mount after your existing auth middleware; req.user must be populated.
module.exports = function notificationRoutes() {
  const router = express.Router();
  router.use((req, res, next) => {
    const id = engine.userId(req.user);
    if (!id) return res.status(401).json({ message: 'Authentication required' });
    req.reminderUserId = id;
    next();
  });
  router.get('/preferences', (req, res) => {
    const state = engine.readState();
    res.json({ preferences: engine.preferences(state, req.reminderUserId) });
  });
  router.put('/preferences', (req, res) => {
    try {
      const input = engine.validatePrefs(req.body);
      const state = engine.readState();
      state.preferences[req.reminderUserId] = { ...engine.preferences(state, req.reminderUserId), ...input };
      engine.saveState(state);
      res.json({ preferences: state.preferences[req.reminderUserId] });
    } catch (error) { res.status(400).json({ message: error.message }); }
  });
  router.get('/inbox', (req, res) => {
    const state = engine.readState();
    const since = Math.max(0, Number(req.query.since) || 0);
    res.json({ notifications: engine.getDue(state, req.reminderUserId, since) });
  });
  router.patch('/inbox/:id/read', (req, res) => {
    const state = engine.readState();
    if (!engine.markRead(state, req.reminderUserId, req.params.id)) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true });
  });
  return router;
};

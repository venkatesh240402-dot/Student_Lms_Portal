const express = require('express');
const { testConnection } = require('../config/db');

const router = express.Router();

router.get('/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;

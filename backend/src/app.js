const express = require('express');
const cors = require('cors');
const path = require('path');
const env = require('./config/env');
const routes = require('./routes');

const app = express();

// Enable CORS
app.use(cors({
  origin: env.corsOrigins,
  credentials: true
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Mount API routes
app.use('/api', routes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server.',
    errors: [err.message]
  });
});

// Start Server
app.listen(env.port, () => {
  console.log(`LMS Backend Server running on port ${env.port}`);
  console.log(`CORS allowed origins: ${env.corsOrigins.join(', ')}`);
});

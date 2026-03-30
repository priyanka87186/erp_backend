const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
require('dotenv').config();

const erpRoutes = require('./routes/erpRoutes');

const app = express();

// ── Middleware ─────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Database ───────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/workshop_erp';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅  MongoDB connected →', MONGO_URI))
  .catch(err => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });

// ── Routes ─────────────────────────────────────
app.use('/api', erpRoutes);

// ── Health check ───────────────────────────────
app.get('/', (req, res) => res.json({ status: 'Phoenix ERP API running', version: '2.0' }));

// ── Error handler ──────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀  Phoenix ERP Backend running on http://localhost:${PORT}`);
});

/**
 * QualysMind — Express Server Entry Point
 *
 * Bootstraps middleware and routes for the QualysMind AI chatbot.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
const sessionMiddleware = require('./middleware/session');
const { requestLogger } = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const { rateLimiter, destructiveRateLimiter } = require('./middleware/rateLimiter');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(sessionMiddleware);

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ───────────────────────────────────────────────────────────────
const chatRouter = require('./routes/chat');
const statusRouter = require('./routes/status');
const confirmRouter = require('./routes/confirm');
const quickActionsRouter = require('./routes/quickActions');
const modelsRouter = require('./routes/models');

app.use('/api/chat', rateLimiter, chatRouter);
app.use('/api/status', statusRouter);
app.use('/api/confirm', destructiveRateLimiter, confirmRouter);
app.use('/api/quick-actions', quickActionsRouter);
app.use('/api/models', modelsRouter);

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = config.port;

app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║                                                    ║');
    console.log('║     🛡️  QualysMind — AI Vulnerability Assistant    ║');
    console.log('║                                                    ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`   🌐 Server:     http://localhost:${PORT}`);
    console.log(`   🤖 AI:         ${config.aiProvider}`);
    console.log(`   🔗 Qualys:     ${config.qualys.baseUrl}`);
    console.log(`   🌍 Env:        ${config.nodeEnv}`);
    console.log('');
    console.log('   Ready to assist with Qualys VMDR operations.');
    console.log('');
});

module.exports = app;

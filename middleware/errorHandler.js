/**
 * QualysMind — Global Error Handler Middleware
 * Converts unhandled errors into user-friendly JSON responses.
 */

'use strict';

const config = require('../config');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || 500;

    console.error(`[QualysMind Error] ${err.message}`, {
        status,
        path: req.path,
        method: req.method,
        stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });

    // AI errors — pass through specific messages
    const isAiError = err.message && (
        err.message.includes('Gemini') ||
        err.message.includes('OpenAI') ||
        err.message.includes('Groq') ||
        err.message.includes('Ollama') ||
        err.message.includes('rate limit') ||
        err.message.includes('overloaded') ||
        err.message.includes('AI model') ||
        err.message.includes('API key is invalid') ||
        err.message.includes('authentication failed')
    );

    if (isAiError) {
        return res.status(status).json({
            error: true,
            message: `⚠️ ${err.message}`,
        });
    }

    // Qualys / generic errors
    let userMessage = 'An unexpected error occurred. Please try again.';

    if (status === 401) {
        userMessage = 'Authentication failed. The Qualys API credentials may be invalid or expired.';
    } else if (status === 403) {
        userMessage = 'Access denied. Your Qualys account may not have the required permissions for this operation.';
    } else if (status === 404) {
        userMessage = 'The requested resource was not found in the Qualys platform.';
    } else if (status === 429) {
        const retryAfter = err.retryAfter ? ` Please wait ${err.retryAfter} seconds.` : '';
        userMessage = `Qualys API rate limit exceeded.${retryAfter} Please wait before trying again.`;
    } else if (status >= 500) {
        userMessage = 'A server error occurred. Please try again in a moment.';
    }

    if (req.path.startsWith('/api/')) {
        return res.status(status).json({
            error: true,
            message: userMessage,
        });
    }

    res.status(status).json({ error: true, message: userMessage });
}

module.exports = errorHandler;

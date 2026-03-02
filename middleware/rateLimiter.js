/**
 * QualysMind — Rate Limiter Middleware
 */

'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

const rateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: true,
        message: 'Too many requests. Please wait a moment before sending another message.',
    },
    handler: (req, res, next, options) => {
        res.status(429).json(options.message);
    },
});

const destructiveRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.destructiveMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: true,
        message: 'Too many confirmation requests. Please wait before confirming another action.',
    },
    handler: (req, res, next, options) => {
        res.status(429).json(options.message);
    },
});

module.exports = { rateLimiter, destructiveRateLimiter };

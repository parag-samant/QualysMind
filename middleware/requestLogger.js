/**
 * QualysMind — Request Logger Middleware
 */

'use strict';

const morgan = require('morgan');
const config = require('../config');

morgan.token('safe-headers', (req) => {
    const headers = { ...req.headers };
    delete headers['authorization'];
    delete headers['cookie'];
    delete headers['x-api-key'];
    return JSON.stringify(headers);
});

const requestLogger = morgan(config.logging.format, {
    skip: (req) => {
        if (config.nodeEnv === 'production') {
            return req.url.startsWith('/css') || req.url.startsWith('/js');
        }
        return false;
    },
});

module.exports = { requestLogger };

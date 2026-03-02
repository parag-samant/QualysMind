/**
 * QualysMind — Session Middleware
 * Configures express-session with SQLite persistence.
 */

'use strict';

const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const config = require('../config');

const sessionMiddleware = session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: path.join(__dirname, '..'),
        concurrentDB: true,
    }),
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'strict',
        secure: config.nodeEnv === 'production',
        maxAge: config.session.maxAge,
    },
});

module.exports = sessionMiddleware;

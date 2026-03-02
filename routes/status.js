/**
 * QualysMind — Status Route
 *
 * GET /api/status
 */

'use strict';

const express = require('express');
const router = express.Router();
const { getTokenStatus } = require('../services/qualys/auth');
const config = require('../config');
const { getProvider } = require('../services/ai/factory');

router.get('/', async (req, res) => {
    try {
        let qualysStatus = getTokenStatus();
        if (!qualysStatus.authenticated) {
            try {
                const { getValidToken } = require('../services/qualys/auth');
                await getValidToken();
                qualysStatus = getTokenStatus();
            } catch (err) {
                qualysStatus = { authenticated: false, error: err.message };
            }
        }

        const aiProvider = getProvider();

        res.json({
            status: 'ok',
            app: 'QualysMind',
            version: '1.0.0',
            environment: config.nodeEnv,
            qualys: {
                baseUrl: config.qualys.baseUrl,
                authenticated: qualysStatus.authenticated,
                tokenExpiresIn: qualysStatus.expiresIn,
                error: qualysStatus.error || undefined,
            },
            ai: {
                provider: aiProvider.providerName,
                model: aiProvider.model,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.json({
            status: 'degraded',
            qualys: { authenticated: false, error: err.message },
            timestamp: new Date().toISOString(),
        });
    }
});

module.exports = router;

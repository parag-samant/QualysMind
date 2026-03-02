/**
 * QualysMind — Models Route
 *
 * GET  /api/models            → List available providers and models
 * POST /api/models/provider   → Switch active AI provider
 * POST /api/models/switch     → Switch active Ollama model
 */

'use strict';

const express = require('express');
const router = express.Router();
const config = require('../config');
const { getProvider, setProviderOverride, getAvailableProviders } = require('../services/ai/factory');

/**
 * GET /api/models — list all providers and the active one.
 */
router.get('/', async (req, res) => {
    const { providerName, model } = getProvider();
    const providers = getAvailableProviders();

    let ollamaModels = [];

    // If Ollama is active or available, try to list its local models
    if (providerName === 'Ollama') {
        try {
            const ollamaApiBase = config.ollama.baseUrl.replace('/v1', '');
            const response = await fetch(`${ollamaApiBase}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                ollamaModels = (data.models || []).map(m => ({
                    name: m.name,
                    size: m.size,
                    sizeHuman: formatSize(m.size),
                    parameterSize: m.details?.parameter_size || '?',
                    family: m.details?.family || '',
                    isCloud: m.name.includes('-cloud') || m.size === 0,
                }));
            }
        } catch {
            // Ollama not running — that's fine
        }
    }

    res.json({
        activeProvider: providerName.toLowerCase(),
        activeModel: model,
        providers,
        ollamaModels,
        switchable: true,
    });
});

/**
 * POST /api/models/provider — switch the active AI provider.
 */
router.post('/provider', (req, res) => {
    const { provider } = req.body;

    if (!provider || typeof provider !== 'string') {
        return res.status(400).json({ error: true, message: 'Provider name is required.' });
    }

    const validProviders = ['ollama', 'groq', 'gemini', 'openai'];
    const normalized = provider.toLowerCase();

    if (!validProviders.includes(normalized)) {
        return res.status(400).json({
            error: true,
            message: `Invalid provider "${provider}". Valid options: ${validProviders.join(', ')}`,
        });
    }

    setProviderOverride(normalized);

    // Clear session history on provider switch
    if (req.session) req.session.history = [];

    const active = getProvider();

    console.log(`[Models] Switched provider to: ${active.providerName} (${active.model})`);

    res.json({
        success: true,
        provider: active.providerName,
        model: active.model,
        message: `Switched to ${active.providerName} (${active.model}). Chat history cleared.`,
    });
});

/**
 * POST /api/models/switch — switch Ollama model.
 */
router.post('/switch', (req, res) => {
    const { providerName } = getProvider();

    if (providerName !== 'Ollama') {
        return res.status(400).json({
            error: true,
            message: `Model switching is only available for Ollama. Current provider: ${providerName}.`,
        });
    }

    const { model } = req.body;

    if (!model || typeof model !== 'string') {
        return res.status(400).json({ error: true, message: 'Model name is required.' });
    }

    const { setModelOverride, getActiveModel } = require('../services/ollama/chat');
    setModelOverride(model);

    if (req.session) req.session.history = [];

    console.log(`[Models] Switched Ollama model to: ${model}`);

    res.json({
        success: true,
        activeModel: getActiveModel(),
        message: `Switched to ${model}. Chat history cleared.`,
    });
});

function formatSize(bytes) {
    if (!bytes || bytes === 0) return 'Cloud';
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 ** 2);
    return `${mb.toFixed(0)} MB`;
}

module.exports = router;

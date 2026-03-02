/**
 * QualysMind — AI Provider Factory
 *
 * Returns the currently configured AI chat service and tools helper.
 * Supports runtime provider switching via setProviderOverride().
 * Supported providers: Ollama (local), Groq, Gemini, OpenAI
 */

'use strict';

const config = require('../../config');

// Runtime override — allows switching provider without restarting
let providerOverride = null;

/**
 * Override the active AI provider at runtime.
 * @param {string} provider - Provider name (ollama, groq, gemini, openai)
 */
function setProviderOverride(provider) {
    providerOverride = provider ? provider.toLowerCase() : null;
    console.log(`[AI Factory] Provider switched to: ${provider || config.aiProvider}`);
}

/**
 * Get the currently active provider name.
 * @returns {string}
 */
function getActiveProviderName() {
    return providerOverride || config.aiProvider.toLowerCase();
}

/**
 * Returns the active AI provider's chat module and metadata.
 * @returns {{ chat, summarizeResult, providerName, model }}
 */
function getProvider() {
    const provider = getActiveProviderName();

    switch (provider) {
        case 'ollama': {
            const ollama = require('../ollama/chat');
            return {
                ...ollama,
                providerName: 'Ollama',
                model: ollama.getActiveModel(),
            };
        }
        case 'groq': {
            const groq = require('../groq/chat');
            return {
                ...groq,
                providerName: 'Groq',
                model: config.groq.model,
            };
        }
        case 'gemini': {
            const gemini = require('../gemini/chat');
            return {
                ...gemini,
                providerName: 'Gemini',
                model: config.gemini.model,
            };
        }
        case 'openai':
        default: {
            const openai = require('../openai/chat');
            return {
                ...openai,
                providerName: 'OpenAI',
                model: config.openai.model,
            };
        }
    }
}

/**
 * Get list of all available providers with their config status.
 */
function getAvailableProviders() {
    const active = getActiveProviderName();
    return [
        {
            id: 'ollama',
            name: 'Ollama',
            model: config.ollama.model,
            configured: true, // Always available (local)
            active: active === 'ollama',
            badge: '🏠 Local',
        },
        {
            id: 'groq',
            name: 'Groq',
            model: config.groq.model,
            configured: !!config.groq.apiKey,
            active: active === 'groq',
            badge: '⚡ Fast',
        },
        {
            id: 'gemini',
            name: 'Gemini',
            model: config.gemini.model,
            configured: !!config.gemini.apiKey,
            active: active === 'gemini',
            badge: '🆓 Free',
        },
        {
            id: 'openai',
            name: 'OpenAI',
            model: config.openai.model,
            configured: !!config.openai.apiKey,
            active: active === 'openai',
            badge: '🧠 Best',
        },
    ];
}

module.exports = { getProvider, setProviderOverride, getActiveProviderName, getAvailableProviders };

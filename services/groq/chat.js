/**
 * QualysMind — Groq Chat Service
 *
 * Uses the Groq API (OpenAI-compatible) with function calling support.
 * Falls back to text-only when models don't support tools.
 */

'use strict';

const OpenAI = require('openai');
const config = require('../../config');
const { getSystemPrompt } = require('../ai/systemPrompt');
const { getToolDefinitions } = require('../openai/functions');
const { buildSummarizationPrompt } = require('../../utils/summarizationPrompt');

const groqClient = new OpenAI({
    baseURL: config.groq.baseUrl,
    apiKey: config.groq.apiKey,
});

async function chat(messages, enableTools = true) {
    const systemMessage = {
        role: 'system',
        content: getSystemPrompt('compact'),
    };

    const trimmedMessages = trimHistory(messages, 6);

    const requestParams = {
        model: config.groq.model,
        max_tokens: config.groq.maxTokens,
        messages: [systemMessage, ...trimmedMessages],
    };

    const isCompoundModel = config.groq.model.includes('compound');

    if (enableTools && !isCompoundModel) {
        requestParams.tools = getToolDefinitions();
        requestParams.tool_choice = 'auto';
    }

    let response;
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            response = await groqClient.chat.completions.create(requestParams);
            break;
        } catch (err) {
            if (err.status === 401) {
                throw new Error('Groq API authentication failed. Please check your GROQ_API_KEY in .env');
            }

            if (err.status === 400 && enableTools) {
                console.warn(`[Groq] Bad request (400): ${err.message}`);
                console.warn('[Groq] Retrying without tools...');
                delete requestParams.tools;
                delete requestParams.tool_choice;

                const FALLBACK_RETRIES = 3;
                for (let fbAttempt = 0; fbAttempt <= FALLBACK_RETRIES; fbAttempt++) {
                    try {
                        response = await groqClient.chat.completions.create(requestParams);
                        break;
                    } catch (retryErr) {
                        if (retryErr.status === 429 && fbAttempt < FALLBACK_RETRIES) {
                            const waitMs = Math.min(3000 * Math.pow(2, fbAttempt), 12000);
                            console.log(`[Groq] Rate limited on fallback (attempt ${fbAttempt + 1}/${FALLBACK_RETRIES + 1}), waiting ${waitMs / 1000}s...`);
                            await new Promise((r) => setTimeout(r, waitMs));
                            continue;
                        }
                        throw new Error(`Groq API error: ${retryErr.message}`);
                    }
                }
                if (response) break;
            }

            const isRateLimit = err.status === 429;
            const isRetryable = isRateLimit || err.status >= 500;

            if (isRetryable && attempt < MAX_RETRIES) {
                const delayMs = isRateLimit
                    ? Math.min(5000 * (attempt + 1), 25000)
                    : Math.min(2000 * Math.pow(2, attempt), 8000);
                console.log(`[Groq] ${isRateLimit ? 'Rate limited' : 'Server busy'} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delayMs / 1000}s...`);
                await new Promise((r) => setTimeout(r, delayMs));
                continue;
            }

            if (isRateLimit) {
                throw new Error('Groq rate limit reached after retries. Please wait a moment and try again.');
            }
            throw new Error(`Groq API error: ${err.message}`);
        }
    }

    const choice = response.choices?.[0];
    if (!choice) throw new Error('Groq returned an empty response');

    const message = choice.message;

    if (choice.finish_reason === 'tool_calls' && message.tool_calls?.length > 0) {
        const toolCall = message.tool_calls[0];
        let args = {};
        try { args = JSON.parse(toolCall.function.arguments); } catch { args = {}; }

        return {
            type: 'tool_call',
            toolCall: {
                id: toolCall.id,
                name: toolCall.function.name,
                args,
            },
            rawMessage: message,
        };
    }

    return {
        type: 'text',
        content: message.content || '',
        rawMessage: message,
    };
}

async function summarizeResult(functionName, result, originalQuery) {
    const summaryMessages = [
        { role: 'user', content: buildSummarizationPrompt(functionName, result, originalQuery) },
    ];

    try {
        const response = await chat(summaryMessages, false);
        return response.content || '';
    } catch (err) {
        console.error(`[Groq] Summarization failed: ${err.message}`);
        return '';
    }
}

function trimHistory(messages, maxMessages) {
    if (messages.length <= maxMessages) return messages;
    return messages.slice(messages.length - maxMessages);
}

module.exports = { chat, summarizeResult };

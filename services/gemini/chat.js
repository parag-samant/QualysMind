/**
 * QualysMind — Google Gemini Chat Service
 *
 * Primary AI backend using the Gemini API (free tier).
 * Falls back to OpenAI when rate limited.
 */

'use strict';

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const config = require('../../config');
const openaiFallback = require('../openai/chat');
const { getSystemPrompt } = require('../ai/systemPrompt');
const { getFunctionDeclarations } = require('./functions');
const { buildSummarizationPrompt } = require('../../utils/summarizationPrompt');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

function toGeminiHistory(messages) {
    return messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content || '' }],
    }));
}

async function chat(messages, enableTools = true) {
    const trimmed = messages.length > 20 ? messages.slice(messages.length - 20) : messages;
    const history = trimmed.slice(0, -1);
    const lastMessage = trimmed[trimmed.length - 1];

    if (!lastMessage) throw new Error('No message to send.');

    const modelConfig = {
        model: config.gemini.model,
        systemInstruction: getSystemPrompt('full'),
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
            maxOutputTokens: config.gemini.maxTokens,
            temperature: 0.3,
        },
    };

    if (enableTools) {
        modelConfig.tools = [{ functionDeclarations: getFunctionDeclarations() }];
    }

    const model = genAI.getGenerativeModel(modelConfig);
    const geminiHistory = toGeminiHistory(history);
    const chatSession = model.startChat({ history: geminiHistory });

    let response;
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            response = await chatSession.sendMessage(lastMessage.content || '');
            break;
        } catch (err) {
            if (err.message?.includes('API_KEY_INVALID') || err.status === 400) {
                throw new Error('Gemini API key is invalid. Please check your GEMINI_API_KEY in .env');
            }

            const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
            const isModelBusy = err.message?.includes('503') || err.message?.includes('Service Unavailable');
            const isServerError = err.status === 500 || err.message?.includes('500');
            const isRetryable = isRateLimit || isModelBusy || isServerError;

            if (isRetryable && attempt < MAX_RETRIES) {
                const delayMs = Math.min(2000 * Math.pow(2, attempt), 8000);
                console.log(`[Gemini] ${isRateLimit ? 'Rate limited' : 'Model busy'} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delayMs / 1000}s...`);
                await new Promise((r) => setTimeout(r, delayMs));
                continue;
            }

            if (isRateLimit || isModelBusy) {
                console.warn('[Gemini] Rate limit reached. Falling back to OpenAI...');
                if (config.openai.apiKey) {
                    try {
                        return await openaiFallback.chat(messages, enableTools);
                    } catch (fallbackErr) {
                        throw new Error(`Gemini rate limit reached, and OpenAI fallback also failed: ${fallbackErr.message}`);
                    }
                }
                throw new Error('Gemini rate limit reached after retries. Please wait 10-15 seconds and try again.');
            }
            throw new Error(`Gemini API error: ${err.message}`);
        }
    }

    const candidate = response.response.candidates?.[0];
    if (!candidate) {
        const blockReason = response.response.promptFeedback?.blockReason;
        if (blockReason) {
            return {
                type: 'text',
                content: `⚠️ Gemini blocked this query (reason: ${blockReason}). Try rephrasing your request.`,
            };
        }
        throw new Error('Gemini returned an empty response');
    }

    const content = candidate.content;
    const functionCallPart = content?.parts?.find((p) => p.functionCall);
    if (functionCallPart) {
        const fc = functionCallPart.functionCall;
        return {
            type: 'tool_call',
            toolCall: {
                id: `gemini-${Date.now()}`,
                name: fc.name,
                args: fc.args || {},
            },
        };
    }

    const text = content?.parts?.map((p) => p.text || '').join('') || '';
    return { type: 'text', content: text };
}

async function summarizeResult(functionName, result, originalQuery) {
    const summaryMessages = [
        { role: 'user', content: buildSummarizationPrompt(functionName, result, originalQuery) },
    ];

    try {
        const response = await chat(summaryMessages, false);
        return response.content || '';
    } catch (err) {
        console.warn(`[Gemini] Summarization failed, falling back to OpenAI: ${err.message}`);
        if (config.openai.apiKey) {
            try {
                return await openaiFallback.summarizeResult(functionName, result, originalQuery);
            } catch (fallbackErr) {
                console.warn(`[OpenAI Fallback] Summarization failed: ${fallbackErr.message}`);
                return '';
            }
        }
        return '';
    }
}

module.exports = { chat, summarizeResult };

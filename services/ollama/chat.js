/**
 * QualysMind — Ollama Chat Service (Local AI)
 *
 * Connects to a local Ollama instance via OpenAI-compatible API.
 * No rate limits, no API keys, fully private.
 * Supports tool calling for compatible models.
 */

'use strict';

const OpenAI = require('openai');
const config = require('../../config');
const { getSystemPrompt } = require('../ai/systemPrompt');
const { getToolDefinitions } = require('../openai/functions');
const { buildSummarizationPrompt } = require('../../utils/summarizationPrompt');

let modelOverride = null;

function setModelOverride(model) { modelOverride = model; }
function getActiveModel() { return modelOverride || config.ollama.model; }

function createClient() {
    return new OpenAI({
        baseURL: config.ollama.baseUrl,
        apiKey: 'ollama',
    });
}

async function chat(messages, enableTools = true) {
    const client = createClient();
    const activeModel = getActiveModel();

    const systemMessage = {
        role: 'system',
        content: getSystemPrompt('compact'),
    };

    const trimmedMessages = trimHistory(messages, 10);

    const requestParams = {
        model: activeModel,
        messages: [systemMessage, ...trimmedMessages],
    };

    if (enableTools) {
        requestParams.tools = getToolDefinitions();
        requestParams.tool_choice = 'auto';
    }

    let response;

    try {
        response = await client.chat.completions.create(requestParams);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            throw new Error(
                `Cannot connect to Ollama at ${config.ollama.baseUrl}. ` +
                `Make sure Ollama is running (docker ps | grep ollama).`
            );
        }

        if (err.status === 404 || err.message?.includes('not found')) {
            throw new Error(
                `Model "${activeModel}" not found in Ollama. ` +
                `Pull it with: docker exec ollama ollama pull ${activeModel}`
            );
        }

        if (enableTools && (err.status === 400 || err.message?.includes('does not support tools'))) {
            console.log(`[Ollama] Model ${activeModel} failed with tools, retrying without...`);
            delete requestParams.tools;
            delete requestParams.tool_choice;

            try {
                response = await client.chat.completions.create(requestParams);
            } catch (retryErr) {
                throw new Error(`Ollama error: ${retryErr.message}`);
            }
        } else {
            throw new Error(`Ollama error: ${err.message}`);
        }
    }

    const choice = response.choices?.[0];
    if (!choice) throw new Error('Ollama returned an empty response');

    const message = choice.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        let args = {};
        try {
            args = typeof toolCall.function.arguments === 'string'
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function.arguments || {};
        } catch { args = {}; }

        return {
            type: 'tool_call',
            toolCall: {
                id: toolCall.id || `ollama_${Date.now()}`,
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
        console.error(`[Ollama] Summarization failed: ${err.message}`);
        return '';
    }
}

function trimHistory(messages, maxMessages) {
    if (messages.length <= maxMessages) return messages;
    return messages.slice(messages.length - maxMessages);
}

module.exports = { chat, summarizeResult, setModelOverride, getActiveModel };

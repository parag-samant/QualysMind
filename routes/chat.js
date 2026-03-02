/**
 * QualysMind — Chat Route
 *
 * POST /api/chat
 * Main pipeline: AI → tool call → confirmation (if destructive) → execute → format → respond
 */

'use strict';

const express = require('express');
const router = express.Router();
const { getProvider } = require('../services/ai/factory');
const { routeIntent } = require('../utils/intentRouter');
const { format } = require('../utils/responseFormatter');
const { storePending } = require('../utils/confirmationStore');
const { buildSummarizationPrompt } = require('../utils/summarizationPrompt');
const { DESTRUCTIVE_FUNCTIONS } = require('../services/openai/functions');

router.post('/', async (req, res, next) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                error: true,
                message: 'Message is required.',
            });
        }

        // Initialize session history if needed
        if (!req.session.history) req.session.history = [];

        // Add user message to session history
        req.session.history.push({ role: 'user', content: message });

        // Get the AI provider
        const provider = getProvider();

        // ── Step 1: Send to AI for intent extraction ──────────────────────
        const aiResponse = await provider.chat(req.session.history);

        // ── Step 2a: Text response (no tool call) ─────────────────────────
        if (aiResponse.type === 'text') {
            req.session.history.push({ role: 'assistant', content: aiResponse.content });
            return res.json({
                type: 'assistant',
                message: aiResponse.content,
            });
        }

        // ── Step 2b: Tool call response ───────────────────────────────────
        if (aiResponse.type === 'tool_call') {
            const { name, args } = aiResponse.toolCall;

            console.log(`[Chat] AI tool call: ${name}(${JSON.stringify(args)})`);

            // ── Step 3: Check if destructive ──────────────────────────────
            if (DESTRUCTIVE_FUNCTIONS.has(name)) {
                const humanDescription = buildHumanDescription(name, args);
                const confirmationId = storePending({
                    functionName: name,
                    args,
                    humanDescription,
                });

                const confirmMessage = [
                    `⚠️ **Confirmation Required**`,
                    '',
                    `This action will: **${humanDescription}**`,
                    '',
                    'This is a destructive operation that cannot be undone. Please confirm to proceed.',
                ].join('\n');

                req.session.history.push({ role: 'assistant', content: confirmMessage });

                return res.json({
                    type: 'confirmation',
                    message: confirmMessage,
                    confirmationId,
                    functionName: name,
                });
            }

            // ── Step 4: Execute non-destructive tool call ─────────────────
            let apiResult;
            try {
                apiResult = await routeIntent(name, args);
            } catch (err) {
                const errorMsg = `❌ **API Error:** ${err.message}`;
                req.session.history.push({ role: 'assistant', content: errorMsg });
                return res.json({
                    type: 'assistant',
                    message: errorMsg,
                    functionCalled: name,
                });
            }

            // ── Step 5: Format the result ─────────────────────────────────
            const formattedResult = format(name, apiResult);

            // ── Step 6: Optional AI summarization ─────────────────────────
            let summary = '';
            try {
                summary = await provider.summarizeResult(name, apiResult, message);
            } catch (err) {
                console.warn(`[Chat] Summarization skipped: ${err.message}`);
            }

            const fullResponse = summary
                ? `${summary}\n\n---\n\n${formattedResult}`
                : formattedResult;

            req.session.history.push({ role: 'assistant', content: fullResponse });

            return res.json({
                type: 'assistant',
                message: fullResponse,
                functionCalled: name,
            });
        }

        // Unknown AI response type
        return res.json({
            type: 'assistant',
            message: 'I received an unexpected response. Please try rephrasing your question.',
        });
    } catch (err) {
        next(err);
    }
});

/**
 * Build a human-readable description for destructive actions.
 */
function buildHumanDescription(functionName, args) {
    switch (functionName) {
        case 'launch_scan':
            return `Launch a vulnerability scan targeting ${args.target_ips || 'specified IPs'}${args.title ? ` (${args.title})` : ''}`;
        case 'launch_report':
            return `Generate a ${args.format || 'PDF'} report using template ${args.template_id}${args.target ? ` for ${args.target}` : ''}`;
        default:
            return `Execute ${functionName} with ${JSON.stringify(args)}`;
    }
}

module.exports = router;

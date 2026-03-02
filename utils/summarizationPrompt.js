/**
 * QualysMind — Summarization Prompt
 *
 * Prompt template used by the AI to summarize and interpret Qualys API results
 * alongside the original user query, providing actionable analysis.
 */

'use strict';

/**
 * Build a summarization prompt for the AI to interpret API results.
 * @param {string} functionName  The function that was called
 * @param {object} apiResult     Raw API result
 * @param {string} userMessage   Original user question
 * @returns {string} The prompt for summarization
 */
function buildSummarizationPrompt(functionName, apiResult, userMessage) {
    const resultSnippet = JSON.stringify(apiResult, null, 2).slice(0, 4000);

    return `You are QualysMind, a vulnerability management AI assistant.

The user asked: "${userMessage}"

I executed the Qualys API function \`${functionName}\` and received the following data:

\`\`\`json
${resultSnippet}
\`\`\`

Please provide a brief, actionable analysis of these results:
1. Summarize the key findings (2-3 sentences)
2. Highlight any critical or urgent items
3. Suggest 1-3 specific next steps the analyst should take

Keep your analysis concise and security-focused. Use Qualys severity levels (Urgent/Critical/Serious/Medium/Minimal) and reference specific QIDs, CVEs, or host IPs when relevant.`;
}

module.exports = { buildSummarizationPrompt };

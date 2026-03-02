/**
 * QualysMind — Markdown Renderer
 */

'use strict';

function renderMarkdown(text) {
    if (!text) return '';
    try {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        // Fallback: basic escaping
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    } catch {
        return text.replace(/\n/g, '<br>');
    }
}

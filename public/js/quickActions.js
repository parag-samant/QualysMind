/**
 * QualysMind — Quick Actions Loader
 */

'use strict';

(function () {
    const container = document.getElementById('quickActions');

    async function loadQuickActions() {
        try {
            const response = await fetch('/api/quick-actions');
            const data = await response.json();

            if (data.quickActions && data.quickActions.length > 0) {
                container.innerHTML = data.quickActions.map(action =>
                    `<button class="quick-action-btn" title="${action.description}" onclick="sendExample('${action.message.replace(/'/g, "\\'")}')">${action.label}</button>`
                ).join('');
            }
        } catch (err) {
            console.warn('[QuickActions] Failed to load:', err.message);
        }
    }

    loadQuickActions();
})();

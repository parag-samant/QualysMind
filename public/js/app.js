/**
 * QualysMind — Main Application Logic v2
 * Handles chat messaging, confirmations, sidebar, theme toggle, and UI interactions.
 */

'use strict';

(function () {
    // ── DOM Elements ────────────────────────────────────────
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const confirmationBanner = document.getElementById('confirmationBanner');
    const confirmText = document.getElementById('confirmText');
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const newChatBtn = document.getElementById('newChatBtn');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    let isWaiting = false;
    let pendingConfirmId = null;

    // ── Theme ────────────────────────────────────────────────
    function initTheme() {
        const saved = localStorage.getItem('qualysmind-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        updateThemeIcon(saved);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('qualysmind-theme', next);
        updateThemeIcon(next);
    }

    function updateThemeIcon(theme) {
        themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }

    themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    // ── Sidebar ──────────────────────────────────────────────
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    newChatBtn.addEventListener('click', () => {
        chatMessages.innerHTML = '';
        if (welcomeScreen) {
            chatMessages.appendChild(createWelcomeScreen());
        }
    });

    function createWelcomeScreen() {
        const div = document.createElement('div');
        div.className = 'welcome-screen';
        div.id = 'welcomeScreen';
        div.innerHTML = `
            <div class="welcome-shield">
                <span class="material-symbols-rounded">security</span>
            </div>
            <h2>Welcome to <span class="gradient-text">QualysMind</span></h2>
            <p>Your AI assistant for Qualys VMDR. Ask about vulnerabilities, assets, scans, and compliance.</p>
            <div class="suggestion-chips">
                <button class="chip" onclick="sendExample('Show me all urgent vulnerabilities')">
                    <span class="material-symbols-rounded">bug_report</span>
                    Show urgent vulns
                </button>
                <button class="chip" onclick="sendExample('What is our current vulnerability posture?')">
                    <span class="material-symbols-rounded">analytics</span>
                    Vuln posture
                </button>
                <button class="chip" onclick="sendExample('Search for CVE-2024-3094')">
                    <span class="material-symbols-rounded">search</span>
                    Search a CVE
                </button>
                <button class="chip" onclick="sendExample('List all running scans')">
                    <span class="material-symbols-rounded">radar</span>
                    Running scans
                </button>
            </div>
        `;
        return div;
    }

    // ── Send Message ─────────────────────────────────────────
    async function sendMessage(text) {
        if (!text || !text.trim() || isWaiting) return;
        const message = text.trim();

        // Remove welcome screen
        const welcome = document.getElementById('welcomeScreen');
        if (welcome) welcome.remove();

        appendMessage('user', message);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        isWaiting = true;
        updateSendBtn();

        const typingEl = showTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            const data = await response.json();

            if (typingEl) typingEl.remove();

            if (data.requiresConfirmation) {
                showConfirmation(data.confirmationId, data.message);
            } else {
                appendMessage('assistant', data.response || data.message || 'No response received.');
            }
        } catch (err) {
            if (typingEl) typingEl.remove();
            appendMessage('assistant', `⚠️ Connection error: ${err.message}`);
        } finally {
            isWaiting = false;
            updateSendBtn();
        }
    }

    // ── Append Message ───────────────────────────────────────
    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role);

        if (role === 'assistant') {
            const avatar = document.createElement('div');
            avatar.classList.add('message-avatar');
            avatar.innerHTML = '<span class="material-symbols-rounded">shield</span>';
            messageDiv.appendChild(avatar);
        }

        const body = document.createElement('div');
        body.classList.add('message-body');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = role === 'assistant' ? renderMarkdown(content) : escapeHtml(content);
        body.appendChild(contentDiv);

        // Action buttons for assistant messages
        if (role === 'assistant' && !content.startsWith('⚠️')) {
            const actions = document.createElement('div');
            actions.classList.add('message-actions');
            actions.innerHTML = `
                <button class="action-btn" onclick="navigator.clipboard.writeText(this.closest('.message-body').querySelector('.message-content').innerText)">
                    <span class="material-symbols-rounded">content_copy</span> Copy
                </button>
            `;
            body.appendChild(actions);
        }

        messageDiv.appendChild(body);
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    // ── Typing Indicator ─────────────────────────────────────
    function showTypingIndicator() {
        const msg = document.createElement('div');
        msg.classList.add('message', 'assistant');
        msg.id = 'typingMessage';

        const avatar = document.createElement('div');
        avatar.classList.add('message-avatar');
        avatar.innerHTML = '<span class="material-symbols-rounded">shield</span>';
        msg.appendChild(avatar);

        const body = document.createElement('div');
        body.classList.add('message-body');
        body.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        msg.appendChild(body);

        chatMessages.appendChild(msg);
        scrollToBottom();
        return msg;
    }

    // ── Confirmation Flow ────────────────────────────────────
    function showConfirmation(confirmId, message) {
        pendingConfirmId = confirmId;
        confirmText.textContent = message;
        confirmationBanner.classList.remove('hidden');
    }

    confirmYes.addEventListener('click', async () => {
        if (!pendingConfirmId) return;
        confirmationBanner.classList.add('hidden');
        const typingEl = showTypingIndicator();

        try {
            const response = await fetch('/api/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmationId: pendingConfirmId, confirmed: true }),
            });
            const data = await response.json();
            if (typingEl) typingEl.remove();
            appendMessage('assistant', data.response || data.message || 'Action confirmed.');
        } catch (err) {
            if (typingEl) typingEl.remove();
            appendMessage('assistant', `⚠️ Confirmation failed: ${err.message}`);
        }
        pendingConfirmId = null;
    });

    confirmNo.addEventListener('click', async () => {
        if (!pendingConfirmId) return;
        confirmationBanner.classList.add('hidden');
        appendMessage('assistant', '❌ Action cancelled.');

        try {
            await fetch('/api/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmationId: pendingConfirmId, confirmed: false }),
            });
        } catch { /* ignored */ }
        pendingConfirmId = null;
    });

    // ── Input Handling ───────────────────────────────────────
    sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(chatInput.value);
        }
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
        updateSendBtn();
    });

    function updateSendBtn() {
        sendBtn.disabled = !chatInput.value.trim() || isWaiting;
    }

    updateSendBtn();

    // ── Global helpers ───────────────────────────────────────
    window.sendExample = function (text) {
        chatInput.value = text;
        sendMessage(text);
    };
})();

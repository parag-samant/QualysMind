/**
 * QualysMind — Status Indicator v2
 */

'use strict';

(function () {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');

    async function checkStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();

            if (data.qualys?.authenticated) {
                statusDot.classList.add('connected');
                statusDot.classList.remove('error');
                statusText.textContent = 'Qualys Connected';
            } else {
                statusDot.classList.remove('connected');
                statusDot.classList.add('error');
                statusText.textContent = data.qualys?.error ? 'Auth Error' : 'Not Connected';
            }
        } catch {
            statusDot.classList.remove('connected');
            statusDot.classList.add('error');
            statusText.textContent = 'Offline';
        }
    }

    checkStatus();
    setInterval(checkStatus, 60000);
})();

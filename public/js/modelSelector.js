/**
 * QualysMind — Provider & Model Selector v2
 * Styled for Gemini-like dropdown with Material Symbols.
 */

'use strict';

(function () {
    const badge = document.getElementById('providerBadge');
    const badgeText = badge.querySelector('.badge-text');
    const badgeArrow = badge.querySelector('.badge-arrow');
    const selectorContainer = document.getElementById('modelSelector');
    let dropdownOpen = false;
    let currentData = null;

    async function loadModels() {
        try {
            const response = await fetch('/api/models');
            currentData = await response.json();
            updateBadge();
        } catch {
            badgeText.textContent = 'AI Provider';
        }
    }

    function updateBadge() {
        if (!currentData) return;
        const active = currentData.providers.find(p => p.active);
        if (active) {
            badgeText.textContent = `${active.name} · ${currentData.activeModel}`;
        }
    }

    badge.addEventListener('click', toggleDropdown);

    function toggleDropdown() {
        if (dropdownOpen) {
            closeDropdown();
            return;
        }

        const dropdown = document.createElement('div');
        dropdown.classList.add('model-dropdown');
        dropdown.id = 'modelDropdown';

        // Provider section
        const providerHeader = document.createElement('div');
        providerHeader.classList.add('dropdown-header');
        providerHeader.textContent = 'AI Provider';
        dropdown.appendChild(providerHeader);

        currentData.providers.forEach(provider => {
            const option = document.createElement('div');
            option.classList.add('model-option');
            if (provider.active) option.classList.add('active');
            if (!provider.configured && provider.id !== 'ollama') option.classList.add('disabled');

            const left = document.createElement('span');
            left.classList.add('provider-name');
            left.textContent = provider.name;

            const right = document.createElement('span');
            right.classList.add('model-size');
            right.textContent = provider.configured ? `${provider.badge} · ${provider.model}` : '⚠️ No API key';

            option.appendChild(left);
            option.appendChild(right);

            if (provider.configured || provider.id === 'ollama') {
                option.addEventListener('click', () => switchProvider(provider.id));
            }

            dropdown.appendChild(option);
        });

        // Ollama models section
        if (currentData.activeProvider === 'ollama' && currentData.ollamaModels?.length > 0) {
            const modelHeader = document.createElement('div');
            modelHeader.classList.add('dropdown-header');
            modelHeader.textContent = 'Ollama Models';
            dropdown.appendChild(modelHeader);

            currentData.ollamaModels.forEach(model => {
                const option = document.createElement('div');
                option.classList.add('model-option');
                if (model.name === currentData.activeModel) option.classList.add('active');
                option.innerHTML = `<span>${model.name}</span><span class="model-size">${model.sizeHuman}</span>`;
                option.addEventListener('click', () => switchOllamaModel(model.name));
                dropdown.appendChild(option);
            });
        }

        selectorContainer.style.position = 'relative';
        selectorContainer.appendChild(dropdown);
        dropdownOpen = true;
        badgeArrow.style.transform = 'rotate(180deg)';

        setTimeout(() => document.addEventListener('click', handleOutsideClick), 10);
    }

    function closeDropdown() {
        const dropdown = document.getElementById('modelDropdown');
        if (dropdown) dropdown.remove();
        dropdownOpen = false;
        badgeArrow.style.transform = '';
        document.removeEventListener('click', handleOutsideClick);
    }

    function handleOutsideClick(e) {
        if (!selectorContainer.contains(e.target)) closeDropdown();
    }

    async function switchProvider(providerId) {
        closeDropdown();
        badgeText.textContent = 'Switching...';
        try {
            const res = await fetch('/api/models/provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: providerId }),
            });
            const data = await res.json();
            if (data.success) {
                badgeText.textContent = `${data.provider} · ${data.model}`;
                await loadModels();
            } else {
                badgeText.textContent = 'Error';
                setTimeout(updateBadge, 2000);
            }
        } catch {
            badgeText.textContent = 'Switch failed';
            setTimeout(updateBadge, 2000);
        }
    }

    async function switchOllamaModel(modelName) {
        closeDropdown();
        badgeText.textContent = 'Switching...';
        try {
            const res = await fetch('/api/models/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelName }),
            });
            const data = await res.json();
            if (data.success) {
                badgeText.textContent = `Ollama · ${data.activeModel}`;
                await loadModels();
            } else {
                badgeText.textContent = 'Error';
                setTimeout(updateBadge, 2000);
            }
        } catch {
            badgeText.textContent = 'Switch failed';
            setTimeout(updateBadge, 2000);
        }
    }

    loadModels();
})();

/**
 * QualysMind — Avatar Manager
 */

'use strict';

const AVATARS = {
    user: '👤',
    assistant: '🛡️',
};

function getAvatar(role) {
    return AVATARS[role] || '❓';
}

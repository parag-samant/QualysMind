/**
 * QualysMind — Confirmation Store
 *
 * In-memory store for pending destructive actions requiring user confirmation.
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const pendingConfirmations = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of pendingConfirmations.entries()) {
        if (now - entry.createdAt > config.confirmationTtlMs) {
            pendingConfirmations.delete(id);
        }
    }
}, 60000);

function storePending({ functionName, args, humanDescription }) {
    const confirmationId = uuidv4();
    pendingConfirmations.set(confirmationId, {
        functionName,
        args,
        humanDescription,
        createdAt: Date.now(),
    });
    return confirmationId;
}

function consumePending(confirmationId) {
    const entry = pendingConfirmations.get(confirmationId);
    if (!entry) return null;

    if (Date.now() - entry.createdAt > config.confirmationTtlMs) {
        pendingConfirmations.delete(confirmationId);
        return null;
    }

    pendingConfirmations.delete(confirmationId);
    return entry;
}

function discardPending(confirmationId) {
    pendingConfirmations.delete(confirmationId);
}

module.exports = { storePending, consumePending, discardPending };

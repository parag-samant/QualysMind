/**
 * QualysMind — Qualys JWT Token Manager
 *
 * Handles JWT acquisition, in-memory caching, and automatic refresh.
 * This is the core of transparent authentication for all Qualys API calls.
 *
 * Flow:
 *   1. First call to getValidToken() acquires a JWT via POST /auth
 *   2. Token is cached in memory with its expiry time (4 hours)
 *   3. Subsequent calls check if token is still valid (with 60s buffer)
 *   4. If expired, a new token is acquired automatically
 *   5. The token is NEVER sent to the browser or logged
 *
 * Qualys Auth Methods:
 *   - JWT (primary): POST {gatewayUrl}/auth with username/password → JWT token
 *   - Basic Auth (fallback): Authorization: Basic base64(user:pass)
 */

'use strict';

const axios = require('axios');
const config = require('../../config');

// In-memory token cache — lives only for the duration of the process
let tokenCache = {
    accessToken: null,
    expiresAt: 0, // Unix timestamp in ms
};

// JWT default TTL is 4 hours (14400 seconds)
const DEFAULT_JWT_TTL_SECONDS = 14400;

/**
 * Checks if the cached token is still valid with a 60-second safety buffer.
 * @returns {boolean}
 */
function isTokenValid() {
    return tokenCache.accessToken !== null && Date.now() < tokenCache.expiresAt - 60000;
}

/**
 * Fetches a fresh JWT from Qualys using username/password credentials.
 * POST {gatewayUrl}/auth with form-encoded: username, password, token=true
 * @returns {Promise<string>} The JWT token
 * @throws {Error} If token acquisition fails
 */
async function refreshToken() {
    const url = `${config.qualys.gatewayUrl}/auth`;

    try {
        const response = await axios.post(url, new URLSearchParams({
            username: config.qualys.username,
            password: config.qualys.password,
            token: 'true',
        }).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            // Qualys returns the JWT as plain text in the response body
            responseType: 'text',
        });

        const token = typeof response.data === 'string'
            ? response.data.trim()
            : response.data;

        if (!token) {
            throw new Error('Qualys returned an empty JWT token');
        }

        tokenCache = {
            accessToken: token,
            expiresAt: Date.now() + DEFAULT_JWT_TTL_SECONDS * 1000,
        };

        console.log(`[Auth] Qualys JWT refreshed. Valid for ${DEFAULT_JWT_TTL_SECONDS}s.`);
        return tokenCache.accessToken;
    } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data || err.message;

        if (status === 401) {
            throw new Error(`Qualys authentication failed: Invalid username or password. ${detail}`);
        }
        if (status === 403) {
            throw new Error(`Qualys authentication forbidden: Account may be locked or API access disabled. ${detail}`);
        }
        throw new Error(`Failed to obtain Qualys JWT token: ${detail || err.message}`);
    }
}

/**
 * Returns a valid access token, refreshing if necessary.
 * This is the main function used by the API client.
 * @returns {Promise<string>} A fresh JWT token
 */
async function getValidToken() {
    if (!isTokenValid()) {
        return await refreshToken();
    }
    return tokenCache.accessToken;
}

/**
 * Returns the token status for health-check endpoints.
 * @returns {{ authenticated: boolean, expiresIn: number|null }}
 */
function getTokenStatus() {
    if (!isTokenValid()) {
        return { authenticated: false, expiresIn: null };
    }
    const expiresIn = Math.floor((tokenCache.expiresAt - Date.now()) / 1000);
    return { authenticated: true, expiresIn };
}

/**
 * Returns a Basic Auth header value for fallback authentication.
 * Used when JWT auth is unavailable or for specific endpoints.
 * @returns {string} Base64-encoded credentials
 */
function getBasicAuthHeader() {
    const credentials = Buffer.from(`${config.qualys.username}:${config.qualys.password}`).toString('base64');
    return `Basic ${credentials}`;
}

/**
 * Invalidates the token cache (useful for testing or forced re-auth).
 */
function invalidateToken() {
    tokenCache = { accessToken: null, expiresAt: 0 };
}

module.exports = { getValidToken, getTokenStatus, getBasicAuthHeader, invalidateToken };

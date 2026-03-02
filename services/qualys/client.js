/**
 * QualysMind — Qualys Base HTTP Client
 *
 * An Axios instance pre-configured with the Qualys API base URL.
 * Uses a request interceptor to inject a fresh JWT token on every request.
 * Uses a response interceptor to:
 *   - Auto-detect and parse XML responses
 *   - Monitor rate limit headers
 *   - Normalize errors into a standard format
 *
 * Key design decisions:
 *   - Qualys v2 APIs use form-encoded params, not JSON body
 *   - Many endpoints return XML — we auto-parse to JSON
 *   - Rate limit headers must be monitored (X-RateLimit-*)
 *   - X-Requested-With header required for CSRF protection
 */

'use strict';

const axios = require('axios');
const config = require('../../config');
const { getValidToken } = require('./auth');
const { parseQualysXml, isXmlResponse } = require('./xmlParser');

const qualysClient = axios.create({
    baseURL: config.qualys.baseUrl,
    timeout: 60000, // Qualys APIs can be slower; 60s timeout
    headers: {
        'Accept': 'application/json',  // Request JSON when available
        'X-Requested-With': 'QualysMind', // Required for CSRF protection
    },
    // Qualys v2 uses repeated params like ids=1&ids=2
    paramsSerializer: {
        serialize: (params) => {
            const parts = [];
            for (const [key, value] of Object.entries(params)) {
                if (Array.isArray(value)) {
                    for (const v of value) {
                        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
                    }
                } else if (value !== undefined && value !== null) {
                    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                }
            }
            return parts.join('&');
        },
    },
});

// ── Request Interceptor — inject JWT Bearer token automatically ──────────────
qualysClient.interceptors.request.use(
    async (axiosConfig) => {
        try {
            const token = await getValidToken();
            axiosConfig.headers['Authorization'] = `Bearer ${token}`;
        } catch (err) {
            // Let the error propagate — will be caught by the caller
            return Promise.reject(err);
        }
        return axiosConfig;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor — XML parsing, rate limits, error normalization ─────
qualysClient.interceptors.response.use(
    (response) => {
        // Monitor rate limit headers
        const remaining = response.headers['x-ratelimit-remaining'];
        const waitSec = response.headers['x-ratelimit-towait-sec'];

        if (remaining !== undefined && parseInt(remaining) < 5) {
            console.warn(`[RateLimit] ⚠️ Only ${remaining} API calls remaining in window.`);
        }
        if (waitSec && parseInt(waitSec) > 0) {
            console.warn(`[RateLimit] Must wait ${waitSec}s before next call.`);
        }

        // Auto-detect and parse XML responses
        const contentType = response.headers['content-type'] || '';
        if (isXmlResponse(contentType) && typeof response.data === 'string') {
            try {
                response.data = parseQualysXml(response.data);
                response._wasXml = true;
            } catch (parseErr) {
                console.warn('[Client] XML parse failed, returning raw:', parseErr.message);
            }
        }

        return response;
    },
    (error) => {
        if (error.response) {
            const { status, data, headers } = error.response;

            // Check for rate limit blocking
            const waitSec = headers?.['x-ratelimit-towait-sec'];
            if (status === 409 && waitSec) {
                const normalizedError = new Error(
                    `Qualys API rate limit exceeded. Please wait ${waitSec} seconds before retrying.`
                );
                normalizedError.status = 429; // Normalize to standard rate limit code
                normalizedError.retryAfter = parseInt(waitSec);
                return Promise.reject(normalizedError);
            }

            // Try to extract error message from various Qualys formats
            let message;

            // JSON error format
            if (data?.responseErrorDetails?.errorMessage) {
                message = data.responseErrorDetails.errorMessage;
            }
            // XML error format (already parsed)
            else if (data?.SIMPLE_RETURN?.RESPONSE?.TEXT) {
                message = data.SIMPLE_RETURN.RESPONSE.TEXT;
            }
            // Plain text error
            else if (typeof data === 'string' && data.length < 500) {
                // Try to parse as XML if it looks like XML
                if (data.includes('<')) {
                    try {
                        const parsed = parseQualysXml(data);
                        message = parsed?.SIMPLE_RETURN?.RESPONSE?.TEXT || data;
                    } catch {
                        message = data;
                    }
                } else {
                    message = data;
                }
            }
            // Generic
            else {
                message = `HTTP ${status} error`;
            }

            const normalizedError = new Error(message);
            normalizedError.status = status;
            normalizedError.statusCode = status;
            normalizedError.qualysResponse = data;

            return Promise.reject(normalizedError);
        }

        // Network or timeout error
        if (error.code === 'ECONNABORTED') {
            return Promise.reject(new Error('Qualys API request timed out. Please try again.'));
        }

        return Promise.reject(error);
    }
);

module.exports = qualysClient;

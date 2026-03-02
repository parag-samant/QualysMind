/**
 * QualysMind — Compliance Service
 *
 * Handles compliance policy listing, posture checks, and compliance scans.
 *
 * Key endpoints:
 *   - GET /api/2.0/fo/compliance/policy/?action=list     — List policies
 *   - GET /pcrs/1.0/posture/hostids                       — Compliance posture
 *   - GET /api/2.0/fo/scan/compliance/?action=list        — Compliance scans
 */

'use strict';

const client = require('./client');

/**
 * List compliance policies.
 */
async function listCompliancePolicies() {
    const response = await client.get('/api/2.0/fo/compliance/policy/', {
        params: {
            action: 'list',
            output_format: 'JSON',
        },
    });

    const data = response.data;
    const policyList = data?.COMPLIANCE_POLICY_LIST_OUTPUT?.RESPONSE?.POLICY_LIST?.POLICY || [];
    const policies = Array.isArray(policyList) ? policyList : [policyList].filter(Boolean);

    return {
        policies: policies.map(p => ({
            id: p.ID,
            title: p.TITLE,
            description: p.DESCRIPTION,
            status: p.STATUS,
            createdDate: p.CREATED_DATE,
            lastUpdated: p.LAST_UPDATED,
            controlCount: p.CONTROL_COUNT,
        })),
        total: policies.length,
    };
}

/**
 * Get compliance posture for a specific policy.
 * @param {object} opts
 * @param {string} opts.policyId - Compliance policy ID
 */
async function getCompliancePosture({ policyId } = {}) {
    const params = {};
    if (policyId) params.policy_id = policyId;

    try {
        const response = await client.get('/pcrs/1.0/posture/hostids', { params });
        return response.data;
    } catch (err) {
        // The PCRS endpoint may not be available on all platforms
        if (err.status === 404 || err.statusCode === 404) {
            return {
                message: 'Compliance posture endpoint is not available on your Qualys platform subscription.',
                error: true,
            };
        }
        throw err;
    }
}

/**
 * List compliance scans.
 * @param {object} opts
 * @param {number} [opts.limit]    Max results
 * @param {string} [opts.status]   Filter by status
 */
async function listComplianceScans({ limit = 20, status = '' } = {}) {
    const params = {
        action: 'list',
        output_format: 'JSON',
    };

    if (status) params.state = status;

    const response = await client.get('/api/2.0/fo/scan/compliance/', { params });
    const data = response.data;

    const scanList = data?.COMPLIANCE_SCAN_LIST_OUTPUT?.RESPONSE?.SCAN_LIST?.SCAN || [];
    const scans = Array.isArray(scanList) ? scanList : [scanList].filter(Boolean);

    const results = scans.slice(0, limit).map(s => ({
        ref: s.REF,
        title: s.TITLE,
        status: s.STATUS?.STATE,
        launchDate: s.LAUNCH_DATETIME,
        target: s.TARGET,
        policyTitle: s.POLICY_TITLE,
        duration: s.DURATION,
    }));

    return {
        scans: results,
        total: results.length,
        message: results.length === 0
            ? 'No compliance scans found.'
            : null,
    };
}

module.exports = {
    listCompliancePolicies,
    getCompliancePosture,
    listComplianceScans,
};

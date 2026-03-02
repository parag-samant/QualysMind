/**
 * QualysMind — Reports Service
 *
 * Handles report listing, launching, and downloading.
 *
 * Key endpoints:
 *   - GET  /api/2.0/fo/report/?action=list      — List reports
 *   - POST /api/2.0/fo/report/?action=launch     — Launch report (DESTRUCTIVE)
 *   - GET  /api/2.0/fo/report/?action=fetch       — Download report
 */

'use strict';

const client = require('./client');

/**
 * List generated reports.
 * @param {object} opts
 * @param {number} [opts.limit]  Max results (default 20)
 */
async function listReports({ limit = 20 } = {}) {
    const response = await client.get('/api/2.0/fo/report/', {
        params: {
            action: 'list',
            output_format: 'JSON',
        },
    });

    const data = response.data;
    const reportList = data?.REPORT_LIST_OUTPUT?.RESPONSE?.REPORT_LIST?.REPORT || [];
    const reports = Array.isArray(reportList) ? reportList : [reportList].filter(Boolean);

    const results = reports.slice(0, limit).map(r => ({
        id: r.ID,
        title: r.TITLE,
        type: r.TYPE,
        status: r.STATUS?.STATE,
        format: r.OUTPUT_FORMAT,
        launchDate: r.LAUNCH_DATETIME,
        size: r.SIZE,
        expirationDate: r.EXPIRATION_DATETIME,
    }));

    return {
        reports: results,
        total: results.length,
        message: results.length === 0
            ? 'No reports found.'
            : null,
    };
}

/**
 * Launch a new report.
 * ⚠️ DESTRUCTIVE — requires user confirmation (resource-intensive).
 * @param {object} opts
 * @param {string} opts.templateId   Report template ID
 * @param {string} [opts.target]     Target IPs or asset groups
 * @param {string} [opts.format]     Output format: pdf, csv, html, xml
 */
async function launchReport({ templateId, target = '', format = 'pdf' } = {}) {
    if (!templateId) {
        throw new Error('Report template ID is required.');
    }

    const params = new URLSearchParams();
    params.append('action', 'launch');
    params.append('template_id', templateId);
    params.append('output_format', format);

    if (target) params.append('ips', target);

    const response = await client.post('/api/2.0/fo/report/', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
        message: 'Report generation started.',
        details: response.data,
    };
}

/**
 * Download a generated report.
 * @param {string|number} reportId - Report ID
 */
async function downloadReport(reportId) {
    const response = await client.get('/api/2.0/fo/report/', {
        params: {
            action: 'fetch',
            id: reportId,
        },
        responseType: 'text', // Reports can be large
    });

    return {
        content: typeof response.data === 'string'
            ? response.data.slice(0, 5000) // Truncate for chat display
            : JSON.stringify(response.data).slice(0, 5000),
        message: `Report ${reportId} retrieved. Showing first 5000 characters.`,
        reportId,
    };
}

module.exports = {
    listReports,
    launchReport,
    downloadReport,
};

/**
 * QualysMind — Scan Management Service
 *
 * Handles scan listing, launching, and result fetching.
 *
 * Key endpoints:
 *   - GET  /api/2.0/fo/scan/?action=list       — List scans
 *   - GET  /api/2.0/fo/scan/?action=fetch       — Fetch scan results
 *   - POST /api/2.0/fo/scan/?action=launch      — Launch scan (DESTRUCTIVE)
 *   - GET  /api/2.0/fo/schedule/scan/?action=list — Scan schedules
 *   - GET  /api/2.0/fo/appliance/?action=list    — Scanner appliances
 */

'use strict';

const client = require('./client');

/**
 * List recent scans.
 * @param {object} opts
 * @param {string} [opts.status]  Filter: Running, Finished, Error, Canceled, etc.
 * @param {number} [opts.limit]   Max results
 * @param {string} [opts.type]    Scan type: On-Demand, Scheduled, API
 */
async function listScans({ status = '', limit = 20, type = '' } = {}) {
    const params = {
        action: 'list',
        output_format: 'JSON',
    };

    if (status) params.state = status;
    if (type) params.type = type;

    const response = await client.get('/api/2.0/fo/scan/', { params });
    const data = response.data;

    const scanList = data?.SCAN_LIST_OUTPUT?.RESPONSE?.SCAN_LIST?.SCAN || [];
    const scans = Array.isArray(scanList) ? scanList : [scanList].filter(Boolean);

    const results = scans.slice(0, limit).map(s => ({
        ref: s.REF,
        title: s.TITLE,
        type: s.TYPE,
        status: s.STATUS?.STATE,
        launchDate: s.LAUNCH_DATETIME,
        duration: s.DURATION,
        target: s.TARGET,
        optionProfile: s.OPTION_PROFILE?.TITLE,
        processed: s.PROCESSED,
        scannerName: s.ASSET_GROUP_TITLE_LIST?.ASSET_GROUP_TITLE,
    }));

    return {
        scans: results,
        total: results.length,
        message: results.length === 0
            ? 'No scans found matching your criteria.'
            : null,
    };
}

/**
 * Fetch results for a specific scan.
 * @param {string} scanRef - Scan reference ID (e.g., 'scan/1234567890.12345')
 */
async function getScanResults(scanRef) {
    const response = await client.get('/api/2.0/fo/scan/', {
        params: {
            action: 'fetch',
            scan_ref: scanRef,
            mode: 'brief',
            output_format: 'json',
        },
    });

    return response.data;
}

/**
 * Launch a new vulnerability scan.
 * ⚠️ DESTRUCTIVE — requires user confirmation.
 * @param {object} opts
 * @param {string} opts.targetIps       Target IP addresses or ranges
 * @param {string} [opts.optionTitle]   Scan option profile title
 * @param {string} [opts.scannerName]   Scanner appliance name
 * @param {string} [opts.title]         Scan title
 */
async function launchScan({ targetIps, optionTitle = '', scannerName = '', title = '' } = {}) {
    if (!targetIps) {
        throw new Error('Target IPs are required to launch a scan.');
    }

    const params = new URLSearchParams();
    params.append('action', 'launch');
    params.append('ip', targetIps);
    params.append('scan_title', title || `QualysMind Scan - ${new Date().toISOString()}`);

    if (optionTitle) params.append('option_title', optionTitle);
    if (scannerName) params.append('iscanner_name', scannerName);

    const response = await client.post('/api/2.0/fo/scan/', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
        message: 'Scan launched successfully.',
        scanRef: response.data?.SIMPLE_RETURN?.RESPONSE?.ITEM_LIST?.ITEM?.[0]?.VALUE || 'Check scan list for details.',
        details: response.data,
    };
}

/**
 * List scheduled scans.
 */
async function listScanSchedules() {
    const response = await client.get('/api/2.0/fo/schedule/scan/', {
        params: {
            action: 'list',
            output_format: 'JSON',
        },
    });

    const data = response.data;
    const scheduleList = data?.SCHEDULE_SCAN_LIST_OUTPUT?.RESPONSE?.SCHEDULE_SCAN_LIST?.SCAN || [];
    const schedules = Array.isArray(scheduleList) ? scheduleList : [scheduleList].filter(Boolean);

    return {
        schedules: schedules.map(s => ({
            id: s.ID,
            title: s.TITLE,
            active: s.ACTIVE,
            target: s.TARGET,
            schedule: s.SCHEDULE,
            nextLaunch: s.NEXTLAUNCH_DATETIME,
            lastLaunch: s.LASTLAUNCH_DATETIME,
        })),
        total: schedules.length,
    };
}

/**
 * List scanner appliances.
 */
async function listAppliances() {
    const response = await client.get('/api/2.0/fo/appliance/', {
        params: {
            action: 'list',
            output_format: 'JSON',
        },
    });

    const data = response.data;
    const applianceList = data?.APPLIANCE_LIST_OUTPUT?.RESPONSE?.APPLIANCE_LIST?.APPLIANCE || [];
    const appliances = Array.isArray(applianceList) ? applianceList : [applianceList].filter(Boolean);

    return {
        appliances: appliances.map(a => ({
            id: a.ID,
            name: a.NAME,
            status: a.STATUS,
            type: a.TYPE,
            model: a.MODEL_NUMBER,
            softwareVersion: a.SOFTWARE_VERSION,
            lastCheckin: a.LAST_CHECKED_IN,
            networkId: a.NETWORK_ID,
        })),
        total: appliances.length,
    };
}

module.exports = {
    listScans,
    getScanResults,
    launchScan,
    listScanSchedules,
    listAppliances,
};

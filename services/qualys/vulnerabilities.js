/**
 * QualysMind — Vulnerability / Host Detection Service
 *
 * Handles vulnerability detection listing, CVE searching,
 * and posture summary aggregation from the Qualys VMDR API.
 *
 * Key endpoints:
 *   - GET /api/2.0/fo/asset/host/vm/detection/?action=list  — Host detections
 */

'use strict';

const client = require('./client');

/**
 * List hosts with their vulnerability detections.
 * @param {object} opts
 * @param {string} [opts.filter]     Additional filter parameters
 * @param {number} [opts.limit]      Max results (default 20)
 * @param {string} [opts.severity]   Severity filter (1-5 or range like '4-5')
 * @param {string} [opts.status]     Detection status: New, Active, Fixed, Re-Opened
 * @param {string} [opts.qids]       Comma-separated QIDs to filter
 */
async function listHostDetections({ filter = '', limit = 20, severity = '', status = '', qids = '' } = {}) {
    const params = {
        action: 'list',
        truncation_limit: limit,
        output_format: 'JSON',
    };

    if (severity) params.severities = severity;
    if (status) params.status = status;
    if (qids) params.qids = qids;
    if (filter) params.filter = filter;

    // Request suppressed fields for richer data
    params.show_qds = 1;          // Include Qualys Detection Score
    params.show_results = 1;      // Include scan results
    params.show_igs = 0;          // Exclude info-gathered (keep focused)

    console.log('[listHostDetections] params:', JSON.stringify(params));

    try {
        const response = await client.get('/api/2.0/fo/asset/host/vm/detection/', { params });
        const data = response.data;

        // Handle Qualys response structure (JSON or parsed XML)
        const hostList = data?.HOST_LIST_VM_DETECTION_OUTPUT?.RESPONSE?.HOST_LIST?.HOST
            || data?.data?.HOST_LIST?.HOST
            || [];

        const hosts = Array.isArray(hostList) ? hostList : [hostList].filter(Boolean);

        // Flatten detections from all hosts
        const detections = [];
        for (const host of hosts) {
            const hostDetections = host?.DETECTION_LIST?.DETECTION || [];
            const dets = Array.isArray(hostDetections) ? hostDetections : [hostDetections].filter(Boolean);
            for (const det of dets) {
                detections.push({
                    hostId: host.ID,
                    ip: host.IP,
                    hostname: host.DNS || host.NETBIOS || host.IP,
                    os: host.OS || 'Unknown',
                    qid: det.QID,
                    type: det.TYPE,
                    severity: det.SEVERITY,
                    status: det.STATUS,
                    ssl: det.SSL,
                    results: det.RESULTS,
                    firstFound: det.FIRST_FOUND_DATETIME,
                    lastFound: det.LAST_FOUND_DATETIME,
                    lastFixed: det.LAST_FIXED_DATETIME,
                    timesFound: det.TIMES_FOUND,
                    qds: det.QDS?.['#text'] || det.QDS,
                    qdsFactor: det.QDS_FACTORS,
                    isDisabled: det.IS_DISABLED,
                });
            }
        }

        const warning = data?.HOST_LIST_VM_DETECTION_OUTPUT?.RESPONSE?.WARNING;
        const hasMore = warning?.URL ? true : false;

        return {
            detections,
            total: detections.length,
            hasMore,
            nextUrl: warning?.URL || null,
            message: detections.length === 0
                ? (severity || status || qids
                    ? `No detections found matching your filters. Try broadening your search.`
                    : 'No vulnerability detections found in the environment.')
                : null,
        };
    } catch (err) {
        throw err;
    }
}

/**
 * Search for all hosts affected by a specific CVE.
 * @param {string} cveId - CVE identifier (e.g., 'CVE-2024-12345')
 */
async function searchByCve(cveId) {
    // First, look up the QID for this CVE in the knowledge base
    const kbResponse = await client.get('/api/2.0/fo/knowledge_base/vuln/', {
        params: {
            action: 'list',
            details: 'All',
            cve_ids: cveId,
            output_format: 'JSON',
        },
    });

    const kbData = kbResponse.data;
    const vulnList = kbData?.KNOWLEDGE_BASE_VULN_LIST_OUTPUT?.RESPONSE?.VULN_LIST?.VULN
        || [];
    const vulns = Array.isArray(vulnList) ? vulnList : [vulnList].filter(Boolean);

    if (vulns.length === 0) {
        return {
            detections: [],
            total: 0,
            cveId,
            message: `CVE ${cveId} was not found in the Qualys Knowledge Base. It may not be tracked by Qualys yet.`,
        };
    }

    // Get QIDs associated with this CVE
    const qids = vulns.map(v => v.QID).join(',');

    // Now search for hosts with these QIDs
    const result = await listHostDetections({ qids, limit: 100 });

    return {
        ...result,
        cveId,
        relatedQids: vulns.map(v => ({
            qid: v.QID,
            title: v.TITLE,
            severity: v.SEVERITY_LEVEL,
            cvssScore: v.CVSS?.BASE,
        })),
    };
}

/**
 * Get a vulnerability posture summary — count by severity.
 * Aggregates detection counts from the API.
 */
async function getVulnerabilityPosture() {
    // Fetch detections with high truncation limit for posture calculation
    const params = {
        action: 'list',
        truncation_limit: 1000,
        output_format: 'JSON',
        show_qds: 1,
    };

    const response = await client.get('/api/2.0/fo/asset/host/vm/detection/', { params });
    const data = response.data;

    const hostList = data?.HOST_LIST_VM_DETECTION_OUTPUT?.RESPONSE?.HOST_LIST?.HOST || [];
    const hosts = Array.isArray(hostList) ? hostList : [hostList].filter(Boolean);

    const counts = { urgent: 0, critical: 0, serious: 0, medium: 0, minimal: 0 };

    for (const host of hosts) {
        const detections = host?.DETECTION_LIST?.DETECTION || [];
        const dets = Array.isArray(detections) ? detections : [detections].filter(Boolean);
        for (const det of dets) {
            const sev = parseInt(det.SEVERITY);
            if (sev === 5) counts.urgent++;
            else if (sev === 4) counts.critical++;
            else if (sev === 3) counts.serious++;
            else if (sev === 2) counts.medium++;
            else counts.minimal++;
        }
    }

    return {
        urgent: counts.urgent,
        critical: counts.critical,
        serious: counts.serious,
        medium: counts.medium,
        minimal: counts.minimal,
        total: counts.urgent + counts.critical + counts.serious + counts.medium + counts.minimal,
        hostCount: hosts.length,
    };
}

module.exports = {
    listHostDetections,
    searchByCve,
    getVulnerabilityPosture,
};

/**
 * QualysMind — Knowledge Base Service
 *
 * Provides access to the Qualys vulnerability knowledge base.
 * Contains QID details, CVE mappings, solutions, and CVSS scores.
 *
 * Key endpoints:
 *   - GET /api/2.0/fo/knowledge_base/vuln/?action=list
 */

'use strict';

const client = require('./client');

/**
 * Get full details for a specific vulnerability by QID.
 * @param {number|string} qid - Qualys ID
 */
async function getVulnerabilityDetail(qid) {
    const response = await client.get('/api/2.0/fo/knowledge_base/vuln/', {
        params: {
            action: 'list',
            ids: qid,
            details: 'All',
            output_format: 'JSON',
        },
    });

    const data = response.data;
    const vulnList = data?.KNOWLEDGE_BASE_VULN_LIST_OUTPUT?.RESPONSE?.VULN_LIST?.VULN || [];
    const vulns = Array.isArray(vulnList) ? vulnList : [vulnList].filter(Boolean);

    if (vulns.length === 0) {
        return null;
    }

    const vuln = vulns[0];

    // Extract CVE list
    const cveList = vuln.CVE_LIST?.CVE || [];
    const cves = Array.isArray(cveList) ? cveList : [cveList].filter(Boolean);

    return {
        qid: vuln.QID,
        title: vuln.TITLE,
        category: vuln.CATEGORY,
        severity: vuln.SEVERITY_LEVEL,
        vulnType: vuln.VULN_TYPE,
        publishedDate: vuln.PUBLISHED_DATETIME,
        lastModified: vuln.LAST_SERVICE_MODIFICATION_DATETIME,
        patchable: vuln.PATCHABLE,
        cves: cves.map(c => ({
            id: c.ID,
            url: c.URL,
        })),
        cvss: {
            base: vuln.CVSS?.BASE,
            temporal: vuln.CVSS?.TEMPORAL,
            vector: vuln.CVSS?.ACCESS?.VECTOR,
        },
        cvssV3: {
            base: vuln.CVSS_V3?.BASE,
            temporal: vuln.CVSS_V3?.TEMPORAL,
            vector: vuln.CVSS_V3?.ATTACK_VECTOR,
        },
        diagnosis: vuln.DIAGNOSIS,
        consequence: vuln.CONSEQUENCE,
        solution: vuln.SOLUTION,
        bugtraqList: vuln.BUGTRAQ_LIST?.BUGTRAQ || [],
        softwareList: vuln.SOFTWARE_LIST?.SOFTWARE || [],
        exploitability: vuln.EXPLOITABILITY,
        associatedMalware: vuln.ASSOCIATED_MALWARE,
    };
}

/**
 * Search the Qualys vulnerability knowledge base.
 * @param {object} opts
 * @param {string} [opts.query]      Keyword search
 * @param {string} [opts.cveId]      Filter by CVE ID
 * @param {string} [opts.severity]   Filter by severity level (1-5)
 * @param {number} [opts.limit]      Max results
 */
async function searchKnowledgebase({ query = '', cveId = '', severity = '', limit = 20 } = {}) {
    const params = {
        action: 'list',
        details: 'All',
        output_format: 'JSON',
    };

    if (cveId) params.cve_ids = cveId;
    if (severity) params.severity = severity;
    if (limit) params.truncation_limit = limit;

    // Qualys KB doesn't have a direct keyword search — we fetch and filter
    const response = await client.get('/api/2.0/fo/knowledge_base/vuln/', { params });

    const data = response.data;
    const vulnList = data?.KNOWLEDGE_BASE_VULN_LIST_OUTPUT?.RESPONSE?.VULN_LIST?.VULN || [];
    const vulns = Array.isArray(vulnList) ? vulnList : [vulnList].filter(Boolean);

    let results = vulns.map(vuln => ({
        qid: vuln.QID,
        title: vuln.TITLE,
        severity: vuln.SEVERITY_LEVEL,
        category: vuln.CATEGORY,
        patchable: vuln.PATCHABLE,
        publishedDate: vuln.PUBLISHED_DATETIME,
        cvss: vuln.CVSS?.BASE,
        cvssV3: vuln.CVSS_V3?.BASE,
    }));

    // Client-side keyword filtering if query provided
    if (query) {
        const lowerQuery = query.toLowerCase();
        results = results.filter(v =>
            (v.title || '').toLowerCase().includes(lowerQuery) ||
            (v.category || '').toLowerCase().includes(lowerQuery)
        );
    }

    return {
        vulnerabilities: results,
        total: results.length,
        message: results.length === 0
            ? `No knowledge base entries found matching your criteria.`
            : null,
    };
}

module.exports = {
    getVulnerabilityDetail,
    searchKnowledgebase,
};

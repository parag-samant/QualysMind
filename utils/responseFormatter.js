/**
 * QualysMind — Response Formatter
 *
 * Converts raw Qualys API JSON into clean, Markdown-formatted
 * analyst-friendly summaries for display in the chat UI.
 */

'use strict';

/**
 * Format host detections.
 */
function formatHostDetections(result) {
    if (result.message && (!result.detections || result.detections.length === 0)) {
        return `ℹ️ ${result.message}`;
    }

    const { detections = [], total = 0 } = result;
    if (detections.length === 0) return '✅ **No vulnerability detections found** matching your criteria.';

    const severityLabel = (s) => {
        const sev = parseInt(s);
        if (sev === 5) return '🔴 Urgent';
        if (sev === 4) return '🟠 Critical';
        if (sev === 3) return '🟡 Serious';
        if (sev === 2) return '🔵 Medium';
        return '🟢 Minimal';
    };

    const rows = detections.slice(0, 30).map((d) => {
        const severity = severityLabel(d.severity);
        const status = d.status || 'Unknown';
        const host = d.hostname || d.ip || 'N/A';
        const qid = d.qid || 'N/A';
        const qds = d.qds || 'N/A';
        const lastFound = d.lastFound
            ? new Date(d.lastFound).toLocaleDateString()
            : 'N/A';

        return `| ${qid} | ${severity} | ${status} | ${host} | ${qds} | ${lastFound} |`;
    });

    return [
        `**${total} detection(s) found** (showing ${Math.min(detections.length, 30)}):`,
        '',
        '| QID | Severity | Status | Host | QDS | Last Found |',
        '|---|---|---|---|---|---|',
        ...rows,
    ].join('\n');
}

/**
 * Format vulnerability detail from Knowledge Base.
 */
function formatVulnerabilityDetail(result) {
    if (!result) return '⚠️ No vulnerability details found for the specified QID.';

    const cves = (result.cves || []).map(c => `\`${c.id}\``).join(', ') || 'None';

    return [
        `## 🔍 Vulnerability Detail: QID ${result.qid}`,
        '',
        '| Field | Value |',
        '|---|---|',
        `| **Title** | ${result.title || 'N/A'} |`,
        `| **QID** | ${result.qid} |`,
        `| **Severity** | ${result.severity || 'N/A'} |`,
        `| **Category** | ${result.category || 'N/A'} |`,
        `| **Type** | ${result.vulnType || 'N/A'} |`,
        `| **Patchable** | ${result.patchable || 'N/A'} |`,
        `| **CVEs** | ${cves} |`,
        `| **CVSS v2** | ${result.cvss?.base || 'N/A'} |`,
        `| **CVSS v3** | ${result.cvssV3?.base || 'N/A'} |`,
        `| **Published** | ${result.publishedDate || 'N/A'} |`,
        '',
        result.diagnosis ? `**Diagnosis:** ${result.diagnosis.slice(0, 500)}` : '',
        '',
        result.consequence ? `**Consequence:** ${result.consequence.slice(0, 300)}` : '',
        '',
        result.solution ? `**Solution:** ${result.solution.slice(0, 500)}` : '',
    ].filter(Boolean).join('\n');
}

/**
 * Format CVE search results.
 */
function formatCveSearch(result) {
    if (result.message && (!result.detections || result.detections.length === 0)) {
        return `ℹ️ ${result.message}`;
    }

    const lines = [`## 🔍 CVE Impact Analysis: ${result.cveId}`, ''];

    if (result.relatedQids && result.relatedQids.length > 0) {
        lines.push('**Related QIDs:**');
        for (const q of result.relatedQids) {
            lines.push(`- QID **${q.qid}** — ${q.title} (Severity: ${q.severity}, CVSS: ${q.cvssScore || 'N/A'})`);
        }
        lines.push('');
    }

    if (result.detections && result.detections.length > 0) {
        lines.push(`**${result.total} affected host(s):**`);
        lines.push(formatHostDetections(result));
    }

    return lines.join('\n');
}

/**
 * Format vulnerability posture summary.
 */
function formatVulnerabilityPosture(result) {
    const { urgent = 0, critical = 0, serious = 0, medium = 0, minimal = 0, total = 0, hostCount = 0 } = result;

    return [
        '## 🛡️ Vulnerability Posture Summary', '',
        '| Severity | Count |', '|---|---|',
        `| 🔴 **Urgent (5)** | ${urgent} |`,
        `| 🟠 **Critical (4)** | ${critical} |`,
        `| 🟡 **Serious (3)** | ${serious} |`,
        `| 🔵 **Medium (2)** | ${medium} |`,
        `| 🟢 **Minimal (1)** | ${minimal} |`,
        `| **Total Detections** | **${total}** |`,
        `| **Hosts Scanned** | ${hostCount} |`, '',
        urgent + critical > 0
            ? `⚠️ **${urgent + critical} urgent/critical vulnerabilities** require immediate attention.`
            : '✅ No urgent or critical vulnerabilities detected.',
    ].join('\n');
}

/**
 * Format assets list.
 */
function formatAssets(result) {
    const { assets = [], total = 0 } = result;
    if (assets.length === 0) return '✅ **No assets found** matching your criteria.';

    const rows = assets.map((a) => {
        const hostname = a.hostname || 'N/A';
        const ip = a.ip || 'N/A';
        const os = a.os || 'N/A';
        const lastScan = a.lastScanDate ? new Date(a.lastScanDate).toLocaleDateString() : 'Never';
        return `| ${hostname} | \`${ip}\` | ${os} | ${lastScan} |`;
    });

    return [
        `**${total} asset(s) found:**`,
        '', '| Hostname | IP | OS | Last Scan |',
        '|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Format asset detail.
 */
function formatAssetDetail(result) {
    if (!result) return '⚠️ No asset details found.';

    return [
        `## 💻 Asset Detail: ${result.hostname || result.ip}`,
        '',
        '| Field | Value |',
        '|---|---|',
        `| **Hostname** | ${result.hostname || 'N/A'} |`,
        `| **IP** | \`${result.ip || 'N/A'}\` |`,
        `| **OS** | ${result.os || 'N/A'} |`,
        `| **Host ID** | ${result.id || 'N/A'} |`,
        `| **Tracking Method** | ${result.trackingMethod || 'N/A'} |`,
        `| **Last Scan** | ${result.lastScanDate || 'Never'} |`,
        `| **Last VM Scan** | ${result.lastVmScanDate || 'Never'} |`,
        `| **Last Auth Scan** | ${result.lastVmAuthScanDate || 'Never'} |`,
        `| **Cloud Provider** | ${result.cloudProvider || 'N/A'} |`,
    ].join('\n');
}

/**
 * Format scans list.
 */
function formatScans(result) {
    const { scans = [], total = 0 } = result;
    if (scans.length === 0) return '✅ **No scans found** matching your criteria.';

    const rows = scans.map((s) => {
        const title = (s.title || 'Untitled').slice(0, 30);
        const status = s.status || 'Unknown';
        const target = (s.target || 'N/A').slice(0, 25);
        const launchDate = s.launchDate ? new Date(s.launchDate).toLocaleString() : 'N/A';
        return `| ${title} | ${status} | ${target} | ${launchDate} |`;
    });

    return [
        `**${total} scan(s) found:**`,
        '', '| Title | Status | Target | Launched |',
        '|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Format reports list.
 */
function formatReports(result) {
    const { reports = [], total = 0 } = result;
    if (reports.length === 0) return '✅ **No reports found.**';

    const rows = reports.map((r) => {
        const title = (r.title || 'Untitled').slice(0, 30);
        const status = r.status || 'Unknown';
        const format = r.format || 'N/A';
        const date = r.launchDate ? new Date(r.launchDate).toLocaleDateString() : 'N/A';
        return `| ${r.id} | ${title} | ${status} | ${format} | ${date} |`;
    });

    return [
        `**${total} report(s) found:**`,
        '', '| ID | Title | Status | Format | Created |',
        '|---|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Format compliance policies.
 */
function formatCompliancePolicies(result) {
    const { policies = [], total = 0 } = result;
    if (policies.length === 0) return '✅ **No compliance policies found.**';

    const rows = policies.map((p) => {
        const title = (p.title || 'Untitled').slice(0, 40);
        const status = p.status || 'N/A';
        const controls = p.controlCount || 'N/A';
        return `| ${p.id} | ${title} | ${status} | ${controls} |`;
    });

    return [
        `**${total} compliance policy/ies found:**`,
        '', '| ID | Title | Status | Controls |',
        '|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Format knowledge base search results.
 */
function formatKnowledgebaseSearch(result) {
    const { vulnerabilities = [], total = 0 } = result;
    if (result.message && vulnerabilities.length === 0) return `ℹ️ ${result.message}`;
    if (vulnerabilities.length === 0) return '✅ **No matching entries found** in the Knowledge Base.';

    const rows = vulnerabilities.map((v) => {
        const qid = v.qid || 'N/A';
        const title = (v.title || 'N/A').slice(0, 40);
        const severity = v.severity || 'N/A';
        const patchable = v.patchable || 'N/A';
        return `| ${qid} | ${title} | ${severity} | ${patchable} |`;
    });

    return [
        `**${total} KB entries found:**`,
        '', '| QID | Title | Severity | Patchable |',
        '|---|---|---|---|', ...rows,
    ].join('\n');
}

/**
 * Generic fallback formatter.
 */
function formatGeneric(result, maxLength = 3000) {
    const json = JSON.stringify(result, null, 2);
    const truncated = json.slice(0, maxLength);
    return ['```json', truncated, json.length > maxLength ? '... (truncated)' : '', '```'].filter(Boolean).join('\n');
}

/**
 * Main dispatch — checks for graceful error passthrough first.
 */
function format(functionName, result) {
    if (!result) return '⚠️ No data returned from the API.';

    // Graceful error passthrough
    if (result.error && result.message) return result.message;

    // Message-only passthrough
    if (result.message && !result.detections && !result.assets &&
        !result.scans && !result.reports && !result.policies &&
        !result.vulnerabilities && !result.appliances && !result.schedules) {
        return `ℹ️ ${result.message}`;
    }

    try {
        switch (functionName) {
            case 'list_host_detections':
                return formatHostDetections(result);
            case 'get_vulnerability_detail':
                return formatVulnerabilityDetail(result);
            case 'search_by_cve':
                return formatCveSearch(result);
            case 'get_vulnerability_posture':
                return formatVulnerabilityPosture(result);
            case 'search_knowledgebase':
                return formatKnowledgebaseSearch(result);
            case 'list_assets':
                return formatAssets(result);
            case 'get_asset_detail':
                return formatAssetDetail(result);
            case 'list_scans':
            case 'list_compliance_scans':
                return formatScans(result);
            case 'list_reports':
                return formatReports(result);
            case 'list_compliance_policies':
                return formatCompliancePolicies(result);
            default:
                return formatGeneric(result);
        }
    } catch (err) {
        console.error('[Formatter] Error formatting result:', err.message);
        return formatGeneric(result);
    }
}

module.exports = { format };

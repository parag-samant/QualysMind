/**
 * QualysMind — Intent Router
 *
 * Maps OpenAI function call names to the correct Qualys service module methods.
 * This is the central dispatch table for all AI-initiated API calls.
 */

'use strict';

const vulnerabilities = require('../services/qualys/vulnerabilities');
const knowledgeBase = require('../services/qualys/knowledgeBase');
const assets = require('../services/qualys/assets');
const assetGroups = require('../services/qualys/assetGroups');
const scans = require('../services/qualys/scans');
const reports = require('../services/qualys/reports');
const compliance = require('../services/qualys/compliance');

/**
 * Route a function call to the correct service method.
 * @param {string} functionName   The OpenAI function name
 * @param {object} args           Parsed function arguments
 * @returns {Promise<object>}     The API result
 */
async function routeIntent(functionName, args) {
    console.log(`[IntentRouter] Routing: ${functionName}`, JSON.stringify(args));

    switch (functionName) {
        // ── Vulnerability Management ────────────────────────────────────
        case 'list_host_detections':
            return await vulnerabilities.listHostDetections({
                severity: args.severity,
                status: args.status,
                limit: args.limit,
                qids: args.qids,
            });

        case 'get_vulnerability_detail':
            return await knowledgeBase.getVulnerabilityDetail(args.qid);

        case 'search_by_cve':
            return await vulnerabilities.searchByCve(args.cve_id);

        case 'get_vulnerability_posture':
            return await vulnerabilities.getVulnerabilityPosture();

        case 'search_knowledgebase':
            return await knowledgeBase.searchKnowledgebase({
                query: args.query,
                cveId: args.cve_id,
                severity: args.severity,
                limit: args.limit,
            });

        // ── Asset Management ────────────────────────────────────────────
        case 'list_assets':
            return await assets.listAssets({
                limit: args.limit,
                os: args.os,
                ips: args.ips,
            });

        case 'get_asset_detail':
            return await assets.getAssetDetail({
                hostId: args.host_id,
                ip: args.ip,
            });

        case 'list_asset_groups':
            return await assetGroups.listAssetGroups({
                title: args.title,
                limit: args.limit,
            });

        case 'list_ips':
            return await assets.listIps();

        // ── Scan Management ─────────────────────────────────────────────
        case 'list_scans':
            return await scans.listScans({
                status: args.status,
                limit: args.limit,
                type: args.type,
            });

        case 'get_scan_results':
            return await scans.getScanResults(args.scan_ref);

        case 'launch_scan':
            return await scans.launchScan({
                targetIps: args.target_ips,
                optionTitle: args.option_title,
                scannerName: args.scanner_name,
                title: args.title,
            });

        case 'list_scan_schedules':
            return await scans.listScanSchedules();

        case 'list_appliances':
            return await scans.listAppliances();

        // ── Reports ─────────────────────────────────────────────────────
        case 'list_reports':
            return await reports.listReports({ limit: args.limit });

        case 'launch_report':
            return await reports.launchReport({
                templateId: args.template_id,
                target: args.target,
                format: args.format,
            });

        case 'download_report':
            return await reports.downloadReport(args.report_id);

        // ── Compliance ──────────────────────────────────────────────────
        case 'list_compliance_policies':
            return await compliance.listCompliancePolicies();

        case 'get_compliance_posture':
            return await compliance.getCompliancePosture({
                policyId: args.policy_id,
            });

        case 'list_compliance_scans':
            return await compliance.listComplianceScans({
                limit: args.limit,
                status: args.status,
            });

        // ── Unknown ─────────────────────────────────────────────────────
        default:
            throw new Error(`Unknown function: "${functionName}". This function is not mapped to any Qualys service.`);
    }
}

module.exports = { routeIntent };

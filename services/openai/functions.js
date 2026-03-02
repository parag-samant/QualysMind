/**
 * QualysMind — OpenAI Function Definitions
 *
 * Defines all Qualys VMDR operations as OpenAI function calling tools.
 * OpenAI uses these definitions to extract structured intent from natural language.
 *
 * DESTRUCTIVE operations are marked with `[DESTRUCTIVE]` in their
 * descriptions — the backend checks this flag to require user confirmation.
 */

'use strict';

const FUNCTIONS = [
    // ── Vulnerability Management (Core) ──────────────────────────────────────

    {
        name: 'list_host_detections',
        description: 'List hosts with their vulnerability detections from the Qualys VMDR platform. Shows QIDs, severity levels, detection status (New, Active, Fixed, Re-Opened), and Qualys Detection Scores. Use when analyst asks about vulnerabilities, detections, findings, or security issues on hosts.',
        parameters: {
            type: 'object',
            properties: {
                severity: {
                    type: 'string',
                    description: 'Filter by severity level. Use values 1-5 (1=Minimal, 2=Medium, 3=Serious, 4=Critical, 5=Urgent) or a range like "4-5" for critical and urgent only.',
                },
                status: {
                    type: 'string',
                    description: 'Filter by detection status: New, Active, Fixed, Re-Opened',
                },
                limit: {
                    type: 'integer',
                    description: 'Maximum number of results to return. Default 20. Use higher values (50-100) for comprehensive results.',
                    default: 20,
                },
                qids: {
                    type: 'string',
                    description: 'Comma-separated Qualys IDs to filter by specific vulnerabilities.',
                },
            },
        },
    },

    {
        name: 'get_vulnerability_detail',
        description: 'Get full details of a specific vulnerability from the Qualys Knowledge Base by its QID (Qualys ID). Returns CVE mappings, CVSS scores, diagnosis, solution, and remediation guidance.',
        parameters: {
            type: 'object',
            required: ['qid'],
            properties: {
                qid: {
                    type: 'string',
                    description: 'The Qualys ID (QID) of the vulnerability.',
                },
            },
        },
    },

    {
        name: 'search_by_cve',
        description: 'Find all hosts affected by a specific CVE identifier. Looks up the CVE in the Qualys Knowledge Base, maps it to QIDs, then finds all host detections. Use when analyst asks about a specific CVE impact.',
        parameters: {
            type: 'object',
            required: ['cve_id'],
            properties: {
                cve_id: {
                    type: 'string',
                    description: 'The CVE identifier (e.g., CVE-2024-12345).',
                },
            },
        },
    },

    {
        name: 'get_vulnerability_posture',
        description: 'Get an overall summary of the organization\'s vulnerability posture — counts by severity (Urgent, Critical, Serious, Medium, Minimal). Use when analyst asks about security posture, vulnerability summary, or overall risk.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },

    {
        name: 'search_knowledgebase',
        description: 'Search the Qualys vulnerability knowledge base for information about vulnerabilities. Returns QID details, severity, category, and patchability. Use when analyst asks about a vulnerability type, category, or wants to browse the KB.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Keyword to search for in vulnerability titles and categories.',
                },
                cve_id: {
                    type: 'string',
                    description: 'Filter by specific CVE ID.',
                },
                severity: {
                    type: 'string',
                    description: 'Filter by severity level (1-5).',
                },
                limit: {
                    type: 'integer',
                    description: 'Max results to return. Default 20.',
                    default: 20,
                },
            },
        },
    },

    // ── Asset Management ─────────────────────────────────────────────────────

    {
        name: 'list_assets',
        description: 'List managed hosts/assets in the Qualys environment. Shows IP addresses, hostnames, OS, last scan dates, and asset group memberships. Use when analyst asks about devices, hosts, servers, endpoints, or asset inventory.',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'integer',
                    description: 'Maximum number of results. Default 20.',
                    default: 20,
                },
                os: {
                    type: 'string',
                    description: 'Filter by operating system pattern (e.g., "Windows", "Linux", "Ubuntu").',
                },
                ips: {
                    type: 'string',
                    description: 'Filter by IP addresses or ranges (e.g., "10.0.0.1" or "192.168.1.0-192.168.1.255").',
                },
            },
        },
    },

    {
        name: 'get_asset_detail',
        description: 'Get full details for a specific host/asset by its Qualys host ID or IP address. Returns OS, scan history, cloud info, tags, and group memberships.',
        parameters: {
            type: 'object',
            properties: {
                host_id: {
                    type: 'string',
                    description: 'The Qualys host ID.',
                },
                ip: {
                    type: 'string',
                    description: 'The IP address of the host.',
                },
            },
        },
    },

    {
        name: 'list_asset_groups',
        description: 'List asset groups defined in the Qualys environment. Shows group names, owners, and associated IPs. Use when analyst asks about groupings, segments, or how assets are organized.',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Filter by group title.',
                },
                limit: {
                    type: 'integer',
                    description: 'Max results. Default 50.',
                    default: 50,
                },
            },
        },
    },

    {
        name: 'list_ips',
        description: 'List all tracked IP addresses and ranges in the Qualys subscription. Shows which IPs are being monitored for vulnerabilities.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },

    // ── Scan Management ──────────────────────────────────────────────────────

    {
        name: 'list_scans',
        description: 'List recent vulnerability scans. Shows scan status (Running, Finished, Error), targets, launch dates, and durations. Use when analyst asks about scan history, running scans, or scan results.',
        parameters: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    description: 'Filter by scan state: Running, Finished, Paused, Canceled, Error.',
                },
                limit: {
                    type: 'integer',
                    description: 'Max results. Default 20.',
                    default: 20,
                },
                type: {
                    type: 'string',
                    description: 'Filter by scan type: On-Demand, Scheduled, API.',
                },
            },
        },
    },

    {
        name: 'get_scan_results',
        description: 'Download and display results for a specific scan by its reference ID. Shows vulnerabilities found during that scan.',
        parameters: {
            type: 'object',
            required: ['scan_ref'],
            properties: {
                scan_ref: {
                    type: 'string',
                    description: 'The scan reference ID (e.g., "scan/1234567890.12345").',
                },
            },
        },
    },

    {
        name: 'launch_scan',
        description: '[DESTRUCTIVE] Launch a new vulnerability scan on specified targets. This will actively probe the target hosts for vulnerabilities. REQUIRES USER CONFIRMATION before execution.',
        parameters: {
            type: 'object',
            required: ['target_ips'],
            properties: {
                target_ips: {
                    type: 'string',
                    description: 'Target IP addresses or ranges to scan (e.g., "192.168.1.0/24" or "10.0.0.1-10.0.0.50").',
                },
                option_title: {
                    type: 'string',
                    description: 'Name of the scan option profile to use.',
                },
                scanner_name: {
                    type: 'string',
                    description: 'Name of the scanner appliance to use.',
                },
                title: {
                    type: 'string',
                    description: 'Title for the scan.',
                },
            },
        },
    },

    {
        name: 'list_scan_schedules',
        description: 'View all scheduled vulnerability scans. Shows schedule frequency, targets, and next launch times.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },

    {
        name: 'list_appliances',
        description: 'List scanner appliances in the Qualys environment. Shows scanner name, status, type, model, and software version.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },

    // ── Reports ──────────────────────────────────────────────────────────────

    {
        name: 'list_reports',
        description: 'List generated reports. Shows report title, type, status, format, and creation dates.',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'integer',
                    description: 'Max results. Default 20.',
                    default: 20,
                },
            },
        },
    },

    {
        name: 'launch_report',
        description: '[DESTRUCTIVE] Generate a new vulnerability report. This is resource-intensive and will generate a report based on the specified template. REQUIRES USER CONFIRMATION.',
        parameters: {
            type: 'object',
            required: ['template_id'],
            properties: {
                template_id: {
                    type: 'string',
                    description: 'Report template ID to use.',
                },
                target: {
                    type: 'string',
                    description: 'Target IPs or asset groups for the report scope.',
                },
                format: {
                    type: 'string',
                    description: 'Output format: pdf, csv, html, xml. Default: pdf.',
                    default: 'pdf',
                },
            },
        },
    },

    {
        name: 'download_report',
        description: 'Download a previously generated report by its ID.',
        parameters: {
            type: 'object',
            required: ['report_id'],
            properties: {
                report_id: {
                    type: 'string',
                    description: 'The ID of the report to download.',
                },
            },
        },
    },

    // ── Compliance ───────────────────────────────────────────────────────────

    {
        name: 'list_compliance_policies',
        description: 'List compliance policies configured in the Qualys environment. Shows policy names, status, and control counts.',
        parameters: {
            type: 'object',
            properties: {},
        },
    },

    {
        name: 'get_compliance_posture',
        description: 'Get compliance posture data for a specific policy. Shows which hosts are compliant vs non-compliant.',
        parameters: {
            type: 'object',
            properties: {
                policy_id: {
                    type: 'string',
                    description: 'The compliance policy ID to check posture for.',
                },
            },
        },
    },

    {
        name: 'list_compliance_scans',
        description: 'List compliance scans. Shows scan status, target hosts, and associated policies.',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'integer',
                    description: 'Max results. Default 20.',
                    default: 20,
                },
                status: {
                    type: 'string',
                    description: 'Filter by scan status.',
                },
            },
        },
    },
];

// Automatically derive the set of destructive function names
const DESTRUCTIVE_FUNCTIONS = new Set(
    FUNCTIONS
        .filter((fn) => fn.description.includes('[DESTRUCTIVE]'))
        .map((fn) => fn.name)
);

/**
 * Get function definitions in OpenAI tool calling format.
 * @returns {Array} Array of tool definitions
 */
function getToolDefinitions() {
    return FUNCTIONS.map((fn) => ({
        type: 'function',
        function: {
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters,
        },
    }));
}

module.exports = { FUNCTIONS, DESTRUCTIVE_FUNCTIONS, getToolDefinitions };

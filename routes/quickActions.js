/**
 * QualysMind — Quick Actions Route
 *
 * GET /api/quick-actions
 * Qualys VMDR-specific quick action buttons.
 */

'use strict';

const express = require('express');
const router = express.Router();

const QUICK_ACTIONS = [
    {
        id: 'urgent-vulns',
        label: '🔴 Urgent Vulns',
        description: 'Show urgent severity vulnerabilities',
        message: 'Show me all urgent (severity 5) vulnerability detections currently active in the environment',
        category: 'vulnerabilities',
    },
    {
        id: 'critical-vulns',
        label: '🟠 Critical Vulns',
        description: 'Show critical severity vulnerabilities',
        message: 'List all critical (severity 4) and urgent (severity 5) active vulnerability detections',
        category: 'vulnerabilities',
    },
    {
        id: 'vuln-posture',
        label: '📊 Vuln Posture',
        description: 'Get vulnerability posture overview',
        message: 'Give me an overall summary of our vulnerability posture by severity',
        category: 'vulnerabilities',
    },
    {
        id: 'list-assets',
        label: '💻 All Assets',
        description: 'List managed hosts and assets',
        message: 'Show me all managed assets with their IP addresses and last scan dates',
        category: 'assets',
    },
    {
        id: 'recent-scans',
        label: '🔍 Recent Scans',
        description: 'View recent vulnerability scans',
        message: 'List the most recent vulnerability scans and their status',
        category: 'scans',
    },
    {
        id: 'running-scans',
        label: '⏳ Running Scans',
        description: 'Check currently running scans',
        message: 'Show me all currently running vulnerability scans',
        category: 'scans',
    },
    {
        id: 'compliance-policies',
        label: '📋 Compliance',
        description: 'List compliance policies',
        message: 'Show me all compliance policies and their status',
        category: 'compliance',
    },
    {
        id: 'asset-groups',
        label: '📂 Asset Groups',
        description: 'View asset group organization',
        message: 'List all asset groups and their owners',
        category: 'assets',
    },
    {
        id: 'scan-appliances',
        label: '🖥️ Scanners',
        description: 'Check scanner appliance status',
        message: 'List all scanner appliances and their current status',
        category: 'scans',
    },
    {
        id: 'reports',
        label: '📑 Reports',
        description: 'View generated reports',
        message: 'Show me the most recent vulnerability reports',
        category: 'reports',
    },
];

router.get('/', (req, res) => {
    res.json({ quickActions: QUICK_ACTIONS });
});

module.exports = router;

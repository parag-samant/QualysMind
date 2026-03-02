/**
 * QualysMind — Asset Management Service
 *
 * Handles host/asset listing and detail retrieval.
 *
 * Key endpoints:
 *   - GET /api/2.0/fo/asset/host/?action=list     — List managed hosts
 *   - GET /api/2.0/fo/asset/ip/?action=list        — List tracked IPs
 */

'use strict';

const client = require('./client');

/**
 * List managed hosts/assets.
 * @param {object} opts
 * @param {string} [opts.filter]   Filter string
 * @param {number} [opts.limit]    Max results (default 20)
 * @param {string} [opts.os]       OS filter
 * @param {string} [opts.ips]      IP addresses or ranges to filter
 */
async function listAssets({ filter = '', limit = 20, os = '', ips = '' } = {}) {
    const params = {
        action: 'list',
        truncation_limit: limit,
        details: 'All/AGs',
        output_format: 'JSON',
    };

    if (os) params.os_pattern = os;
    if (ips) params.ips = ips;

    const response = await client.get('/api/2.0/fo/asset/host/', { params });
    const data = response.data;

    const hostList = data?.HOST_LIST_OUTPUT?.RESPONSE?.HOST_LIST?.HOST || [];
    const hosts = Array.isArray(hostList) ? hostList : [hostList].filter(Boolean);

    const assets = hosts.map(h => ({
        id: h.ID,
        ip: h.IP,
        hostname: h.DNS || h.NETBIOS || h.IP,
        os: h.OS,
        trackingMethod: h.TRACKING_METHOD,
        lastScanDate: h.LAST_SCAN_DATETIME,
        lastVmScanDate: h.LAST_VM_SCANNED_DATE,
        lastVmAuthScanDate: h.LAST_VM_AUTH_SCANNED_DATE,
        assetGroups: h.ASSET_GROUP_IDS,
        tags: h.TAGS?.TAG || [],
    }));

    return {
        assets,
        total: assets.length,
        message: assets.length === 0
            ? 'No assets found matching your criteria.'
            : null,
    };
}

/**
 * Get full details for a specific asset by host ID or IP.
 * @param {object} opts
 * @param {string} [opts.hostId]  Host ID
 * @param {string} [opts.ip]     IP address
 */
async function getAssetDetail({ hostId, ip } = {}) {
    const params = {
        action: 'list',
        details: 'All/AGs',
        output_format: 'JSON',
    };

    if (hostId) params.ids = hostId;
    else if (ip) params.ips = ip;
    else throw new Error('Either hostId or ip must be provided.');

    const response = await client.get('/api/2.0/fo/asset/host/', { params });
    const data = response.data;

    const hostList = data?.HOST_LIST_OUTPUT?.RESPONSE?.HOST_LIST?.HOST || [];
    const hosts = Array.isArray(hostList) ? hostList : [hostList].filter(Boolean);

    if (hosts.length === 0) return null;

    const h = hosts[0];
    return {
        id: h.ID,
        ip: h.IP,
        hostname: h.DNS || h.NETBIOS || h.IP,
        os: h.OS,
        trackingMethod: h.TRACKING_METHOD,
        networkId: h.NETWORK_ID,
        lastScanDate: h.LAST_SCAN_DATETIME,
        lastVmScanDate: h.LAST_VM_SCANNED_DATE,
        lastVmAuthScanDate: h.LAST_VM_AUTH_SCANNED_DATE,
        lastComplianceScanDate: h.LAST_COMPLIANCE_SCAN_DATETIME,
        assetGroups: h.ASSET_GROUP_IDS,
        tags: h.TAGS?.TAG || [],
        cloudProvider: h.CLOUD_PROVIDER,
        cloudService: h.CLOUD_SERVICE,
    };
}

/**
 * List tracked IP addresses and ranges.
 */
async function listIps() {
    const response = await client.get('/api/2.0/fo/asset/ip/', {
        params: {
            action: 'list',
            output_format: 'JSON',
        },
    });

    const data = response.data;

    // IP list can come in different formats
    const ipSet = data?.IP_LIST_OUTPUT?.RESPONSE?.IP_SET || {};
    const ipRanges = ipSet?.IP_RANGE || [];
    const singleIps = ipSet?.IP || [];

    const ranges = Array.isArray(ipRanges) ? ipRanges : [ipRanges].filter(Boolean);
    const ips = Array.isArray(singleIps) ? singleIps : [singleIps].filter(Boolean);

    return {
        ipRanges: ranges,
        ips,
        totalRanges: ranges.length,
        totalIps: ips.length,
    };
}

module.exports = {
    listAssets,
    getAssetDetail,
    listIps,
};

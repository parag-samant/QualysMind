/**
 * QualysMind — Asset Groups Service
 *
 * Manages asset group listing and details.
 *
 * Key endpoint:
 *   - GET /api/2.0/fo/asset/group/?action=list
 */

'use strict';

const client = require('./client');

/**
 * List asset groups.
 * @param {object} opts
 * @param {string} [opts.title]  Filter by group title
 * @param {number} [opts.limit]  Max results (default 50)
 */
async function listAssetGroups({ title = '', limit = 50 } = {}) {
    const params = {
        action: 'list',
        truncation_limit: limit,
        output_format: 'JSON',
    };

    if (title) params.title = title;

    const response = await client.get('/api/2.0/fo/asset/group/', { params });
    const data = response.data;

    const groupList = data?.ASSET_GROUP_LIST_OUTPUT?.RESPONSE?.ASSET_GROUP_LIST?.ASSET_GROUP || [];
    const groups = Array.isArray(groupList) ? groupList : [groupList].filter(Boolean);

    return {
        assetGroups: groups.map(g => ({
            id: g.ID,
            title: g.TITLE,
            ownerName: g.OWNER?.NAME,
            ownerLogin: g.OWNER?.USER_LOGIN,
            ipCount: g.IP_SET ? 'Has IPs' : 'Empty',
            lastUpdate: g.LAST_UPDATE,
            networkId: g.NETWORK_ID,
        })),
        total: groups.length,
    };
}

module.exports = { listAssetGroups };

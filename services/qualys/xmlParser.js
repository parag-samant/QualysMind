/**
 * QualysMind — XML Parser Utility
 *
 * Centralizes XML→JSON parsing for Qualys API responses.
 * Many Qualys v2 endpoints return XML by default.
 * This module uses fast-xml-parser to convert them to JSON.
 */

'use strict';

const { XMLParser } = require('fast-xml-parser');

// Configure parser for Qualys-specific XML structures
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => {
        // These elements are always arrays even if only one item
        const arrayElements = [
            'HOST', 'DETECTION', 'VULN', 'IP', 'ASSET_GROUP',
            'SCAN', 'REPORT', 'APPLIANCE', 'POLICY', 'HOST_ID',
            'ID', 'QID', 'CVE', 'BUGTRAQ', 'TAG', 'SCHEDULE',
            'COMPLIANCE_SCAN', 'IP_RANGE', 'DNS', 'NETBIOS',
        ];
        return arrayElements.includes(name);
    },
    parseTagValue: true,
    trimValues: true,
    // Handle CDATA sections (Qualys often wraps text in CDATA)
    cdataPropName: '#cdata',
    processEntities: true,
});

/**
 * Parse a Qualys XML response string into a JSON object.
 * @param {string} xmlString - Raw XML response from Qualys
 * @returns {object} Parsed JSON representation
 */
function parseQualysXml(xmlString) {
    if (!xmlString || typeof xmlString !== 'string') {
        return null;
    }

    try {
        const result = parser.parse(xmlString);
        return result;
    } catch (err) {
        console.error('[XMLParser] Failed to parse Qualys XML:', err.message);
        throw new Error(`Failed to parse Qualys XML response: ${err.message}`);
    }
}

/**
 * Check if a response is XML based on content-type header.
 * @param {string} contentType - The Content-Type header value
 * @returns {boolean}
 */
function isXmlResponse(contentType) {
    if (!contentType) return false;
    return contentType.includes('text/xml') ||
        contentType.includes('application/xml') ||
        contentType.includes('text/html'); // Qualys sometimes returns XML as text/html
}

module.exports = { parseQualysXml, isXmlResponse };

/**
 * QualysMind — Gemini Function Definitions Converter
 *
 * Converts OpenAI-format function definitions to Gemini's format.
 * Gemini requires FunctionDeclarations in a slightly different schema.
 */

'use strict';

const { FUNCTIONS } = require('../openai/functions');

/**
 * Convert OpenAI parameters to Gemini-compatible schema.
 * Gemini doesn't support additionalProperties and needs explicit types.
 */
function convertParameters(params) {
    if (!params || !params.properties) {
        return { type: 'OBJECT', properties: {} };
    }

    const properties = {};
    for (const [key, value] of Object.entries(params.properties)) {
        properties[key] = {
            type: value.type?.toUpperCase() || 'STRING',
            description: value.description || '',
        };
        if (value.enum) properties[key].enum = value.enum;
    }

    return {
        type: 'OBJECT',
        properties,
        required: params.required || [],
    };
}

/**
 * Get Gemini-format function declarations from the OpenAI definitions.
 * @returns {Array} Gemini function declarations
 */
function getFunctionDeclarations() {
    return FUNCTIONS.map((fn) => ({
        name: fn.name,
        description: fn.description,
        parameters: convertParameters(fn.parameters),
    }));
}

module.exports = { getFunctionDeclarations };

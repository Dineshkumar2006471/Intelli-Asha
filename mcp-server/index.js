#!/usr/bin/env node

/**
 * IntelliASHA — NDHM Disease Surveillance MCP Server
 *
 * This Model Context Protocol (MCP) server acts as a bridge to the
 * (mock) National Digital Health Mission (NDHM) API.
 * It allows IntelliASHA's agents (or any MCP-compatible client) to
 * securely cross-verify local health anomalies with the national database.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'ndhm-surveillance',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Define the tools exposed by this MCP server.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'verify_ndhm_outbreak',
        description: 'Cross-verifies a potential local outbreak with the National Digital Health Mission (NDHM) database.',
        inputSchema: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              description: 'The state, district, or block to check (e.g., "Karnataka", "Bengaluru").',
            },
            symptoms: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of primary symptoms detected locally (e.g., ["fever", "rash"]).',
            },
          },
          required: ['region', 'symptoms'],
        },
      },
      {
        name: 'get_national_guidelines',
        description: 'Retrieves the latest NDHM protocol for handling a specific disease or symptom cluster.',
        inputSchema: {
          type: 'object',
          properties: {
            condition: {
              type: 'string',
              description: 'The condition to retrieve guidelines for (e.g., "Dengue", "Severe Acute Malnutrition").',
            },
          },
          required: ['condition'],
        },
      },
    ],
  };
});

/**
 * Handle tool execution requests.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'verify_ndhm_outbreak') {
    const { region, symptoms } = args;
    
    // In a real system, this would make an authenticated API call to NDHM servers.
    // For the hackathon, we simulate a response based on the inputs.
    const isEndemic = symptoms.includes('fever') && symptoms.includes('rash');
    
    const result = {
      status: 'success',
      region_checked: region,
      national_alert_level: isEndemic ? 'ELEVATED' : 'NORMAL',
      reported_cases_last_7_days: isEndemic ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 5),
      message: isEndemic 
        ? `NDHM records show an uptick in ${symptoms.join(', ')} cases in ${region}. Cross-verification successful. Local outbreak highly probable.`
        : `NDHM baseline for ${region} is normal. The local anomaly might be isolated or an early indicator.`,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === 'get_national_guidelines') {
    const { condition } = args;
    
    let guidelines = '';
    if (condition.toLowerCase().includes('malnutrition')) {
      guidelines = "1. Immediate referral to Nutritional Rehabilitation Centre (NRC). 2. Provide F-75/F-100 therapeutic milk. 3. Monitor for hypoglycemia and hypothermia.";
    } else if (condition.toLowerCase().includes('dengue') || condition.toLowerCase().includes('fever')) {
      guidelines = "1. Ensure adequate hydration. 2. Monitor hematocrit and platelet counts daily. 3. Do not use NSAIDs; paracetamol is recommended for fever.";
    } else {
      guidelines = "Standard NDHM protocol: Isolate if contagious, provide symptomatic relief, and escalate to nearest Primary Health Centre (PHC) if condition deteriorates.";
    }

    return {
      content: [{ type: 'text', text: guidelines }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server using stdio transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NDHM Surveillance MCP Server running on stdio');
}

run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

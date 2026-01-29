#!/usr/bin/env node
/**
 * Plane MCP Wrapper
 * Konvertiert Plane HTTP API zu MCP stdio Protocol
 * Usage: Add to opencode.json as local MCP
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const PLANE_API_URL = process.env.PLANE_API_URL || 'https://plane.delqhi.com';
const PLANE_API_KEY = process.env.PLANE_API_KEY;

const server = new Server(
  {
    name: 'plane-mcp-wrapper',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: List Projects
async function listProjects() {
  const response = await axios.get(`${PLANE_API_URL}/api/v1/workspaces/projects/`, {
    headers: { 'X-API-Key': PLANE_API_KEY }
  });
  return response.data;
}

// Tool: Create Issue
async function createIssue(projectId, title, description) {
  const response = await axios.post(
    `${PLANE_API_URL}/api/v1/workspaces/projects/${projectId}/issues/`,
    { title, description },
    { headers: { 'X-API-Key': PLANE_API_KEY } }
  );
  return response.data;
}

// Tool: List Issues
async function listIssues(projectId) {
  const response = await axios.get(
    `${PLANE_API_URL}/api/v1/workspaces/projects/${projectId}/issues/`,
    { headers: { 'X-API-Key': PLANE_API_KEY } }
  );
  return response.data;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_projects',
        description: 'List all projects in Plane',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
            title: { type: 'string', description: 'Issue title' },
            description: { type: 'string', description: 'Issue description' },
          },
          required: ['projectId', 'title'],
        },
      },
      {
        name: 'list_issues',
        description: 'List all issues in a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
          },
          required: ['projectId'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_projects':
        return { toolResult: await listProjects() };
      case 'create_issue':
        return { toolResult: await createIssue(args.projectId, args.title, args.description) };
      case 'list_issues':
        return { toolResult: await listIssues(args.projectId) };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return { 
      content: [{ 
        type: 'text', 
        text: `Error: ${error.message}` 
      }],
      isError: true 
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);

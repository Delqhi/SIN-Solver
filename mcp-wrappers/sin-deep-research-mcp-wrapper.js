#!/usr/bin/env node
/**
 * SIN Deep Research MCP Wrapper
 * Konvertiert SIN Deep Research HTTP API zu MCP stdio Protocol
 * Service: room-20.4-sin-research-mcp (Port 8204)
 * API: https://research.delqhi.com
 * 
 * Tools:
 * - web_search: DuckDuckGo web search
 * - news_search: DuckDuckGo news search  
 * - extract_content: URL content extraction
 * - deep_research: Search + extract + summarize
 * - steel_browse: Browse with Steel Browser
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const API_URL = process.env.SIN_RESEARCH_API_URL || 'https://research.delqhi.com';
const API_KEY = process.env.SIN_RESEARCH_API_KEY;

const client = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
  }
});

const server = new Server(
  { name: 'sin-deep-research-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Tool: Web Search
async function webSearch(query, maxResults = 10) {
  const response = await client.post('/api/search', {
    query,
    type: 'web',
    max_results: maxResults
  });
  return response.data;
}

// Tool: News Search
async function newsSearch(query, maxResults = 10) {
  const response = await client.post('/api/search', {
    query,
    type: 'news',
    max_results: maxResults
  });
  return response.data;
}

// Tool: Extract Content
async function extractContent(url) {
  const response = await client.post('/api/extract', { url });
  return response.data;
}

// Tool: Deep Research
async function deepResearch(query, depth = 'medium') {
  const response = await client.post('/api/research', {
    query,
    depth // 'quick', 'medium', 'deep'
  });
  return response.data;
}

// Tool: Steel Browse
async function steelBrowse(url, actions = []) {
  const response = await client.post('/api/browse', {
    url,
    actions,
    useSteel: true
  });
  return response.data;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'web_search',
        description: 'Search the web using DuckDuckGo (FREE, no API key)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum results (default: 10)', default: 10 }
          },
          required: ['query']
        }
      },
      {
        name: 'news_search',
        description: 'Search news using DuckDuckGo (FREE, no API key)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum results (default: 10)', default: 10 }
          },
          required: ['query']
        }
      },
      {
        name: 'extract_content',
        description: 'Extract clean content from any URL using trafilatura',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to extract content from' }
          },
          required: ['url']
        }
      },
      {
        name: 'deep_research',
        description: 'Deep research: search + extract + summarize with Gemini',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Research query' },
            depth: { 
              type: 'string', 
              description: 'Research depth: quick, medium, or deep',
              enum: ['quick', 'medium', 'deep'],
              default: 'medium'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'steel_browse',
        description: 'Browse any URL with Steel Browser (handles JavaScript)',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to browse' },
            actions: { 
              type: 'array', 
              description: 'Actions to perform (click, type, etc.)',
              items: { type: 'object' },
              default: []
            }
          },
          required: ['url']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'web_search':
        return { toolResult: await webSearch(args.query, args.maxResults) };
      case 'news_search':
        return { toolResult: await newsSearch(args.query, args.maxResults) };
      case 'extract_content':
        return { toolResult: await extractContent(args.url) };
      case 'deep_research':
        return { toolResult: await deepResearch(args.query, args.depth) };
      case 'steel_browse':
        return { toolResult: await steelBrowse(args.url, args.actions) };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);

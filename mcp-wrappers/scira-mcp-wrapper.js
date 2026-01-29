#!/usr/bin/env node
/**
 * SIN-Solver MCP Wrapper for Scira AI Search
 * Container: room-30-scira-ai-search
 * Port: 8230
 * 
 * This wrapper converts stdio (OpenCode MCP protocol) to HTTP API calls
 * to the Scira AI Search container.
 * 
 * @author SIN-Solver Team
 * @version 1.0.0
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

// Configuration
const SCIRA_API_URL = process.env.SCIRA_API_URL || 'http://localhost:8230';
const SCIRA_API_KEY = process.env.SCIRA_API_KEY || '';
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);

// Create axios instance
const sciraClient = axios.create({
  baseURL: SCIRA_API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'SIN-Solver-MCP-Wrapper/1.0.0',
    ...(SCIRA_API_KEY && { 'Authorization': `Bearer ${SCIRA_API_KEY}` }),
  },
});

// Logger that writes to stderr (stdout is reserved for MCP protocol)
const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };
  console.error(JSON.stringify(logEntry));
};

// Create MCP Server
const server = new Server(
  {
    name: 'room-30-scira-ai-search',
    version: '1.0.0',
    description: 'Scira AI Search MCP - Advanced web search with multiple AI models',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Tool Definitions
 */
const TOOLS = [
  {
    name: 'web_search',
    description: 'Perform AI-powered web search using Scira. Returns comprehensive search results with AI-generated summaries. Supports multiple search providers (Tavily, Exa).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
        },
        provider: {
          type: 'string',
          description: 'Search provider to use',
          enum: ['tavily', 'exa', 'auto'],
          default: 'auto',
        },
        depth: {
          type: 'string',
          description: 'Search depth',
          enum: ['basic', 'advanced', 'extreme'],
          default: 'advanced',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'academic_search',
    description: 'Search academic papers and research using Scira. Great for finding scientific papers, research articles, and academic content.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for academic content',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of papers to return',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
        include_abstracts: {
          type: 'boolean',
          description: 'Include paper abstracts in results',
          default: true,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'reddit_search',
    description: 'Search Reddit posts and discussions. Useful for finding community opinions, discussions, and trending topics.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for Reddit',
        },
        subreddit: {
          type: 'string',
          description: 'Specific subreddit to search (optional)',
        },
        time_range: {
          type: 'string',
          description: 'Time range for posts',
          enum: ['day', 'week', 'month', 'year', 'all'],
          default: 'month',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of posts to return',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'youtube_search',
    description: 'Search YouTube videos with detailed information, captions, and timestamps. Powered by Exa AI.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for YouTube videos',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of videos to return',
          default: 10,
          minimum: 1,
          maximum: 20,
        },
        include_captions: {
          type: 'boolean',
          description: 'Include video captions/transcripts',
          default: true,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'extract_url_content',
    description: 'Extract and analyze content from any URL using Scira. Great for reading articles, documentation, or any web page.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to extract content from',
        },
        include_images: {
          type: 'boolean',
          description: 'Include images from the page',
          default: false,
        },
        max_length: {
          type: 'number',
          description: 'Maximum content length to extract',
          default: 10000,
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'movie_search',
    description: 'Search for movies and TV shows using TMDB. Get detailed information including cast, ratings, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Movie or TV show title to search',
        },
        type: {
          type: 'string',
          description: 'Type of content',
          enum: ['movie', 'tv', 'both'],
          default: 'both',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results',
          default: 10,
          minimum: 1,
          maximum: 20,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'weather_search',
    description: 'Get current weather and forecasts for any location.',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name or location (e.g., "Berlin, Germany")',
        },
        units: {
          type: 'string',
          description: 'Temperature units',
          enum: ['metric', 'imperial'],
          default: 'metric',
        },
        include_forecast: {
          type: 'boolean',
          description: 'Include weather forecast',
          default: true,
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'stock_chart',
    description: 'Generate interactive stock charts with news integration. Supports major stock exchanges worldwide.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Stock symbol (e.g., "AAPL", "MSFT", "TSLA")',
        },
        period: {
          type: 'string',
          description: 'Time period for chart',
          enum: ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y'],
          default: '1mo',
        },
        include_news: {
          type: 'boolean',
          description: 'Include recent news about the stock',
          default: true,
        },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'ai_chat',
    description: 'Chat directly with AI models through Scira. Supports multiple models including Grok, Claude, Gemini, and GPT.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to send to the AI',
        },
        model: {
          type: 'string',
          description: 'AI model to use',
          enum: ['grok-3', 'claude-4-sonnet', 'gemini-2.5-pro', 'gpt-4o', 'auto'],
          default: 'auto',
        },
        context: {
          type: 'string',
          description: 'Additional context for the conversation',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'code_interpreter',
    description: 'Execute Python code with chart generation capabilities. Runs in a sandboxed environment.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Python code to execute',
        },
        generate_charts: {
          type: 'boolean',
          description: 'Allow chart generation',
          default: true,
        },
        timeout: {
          type: 'number',
          description: 'Execution timeout in seconds',
          default: 30,
          minimum: 5,
          maximum: 300,
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'health_check',
    description: 'Check the health status of the Scira AI Search service.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Handle tool listing
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  log('info', 'Listing available tools', { count: TOOLS.length });
  return {
    tools: TOOLS,
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  log('info', `Executing tool: ${name}`, { args });
  
  try {
    let result;
    
    switch (name) {
      case 'web_search':
        result = await handleWebSearch(args);
        break;
      case 'academic_search':
        result = await handleAcademicSearch(args);
        break;
      case 'reddit_search':
        result = await handleRedditSearch(args);
        break;
      case 'youtube_search':
        result = await handleYouTubeSearch(args);
        break;
      case 'extract_url_content':
        result = await handleExtractUrl(args);
        break;
      case 'movie_search':
        result = await handleMovieSearch(args);
        break;
      case 'weather_search':
        result = await handleWeatherSearch(args);
        break;
      case 'stock_chart':
        result = await handleStockChart(args);
        break;
      case 'ai_chat':
        result = await handleAIChat(args);
        break;
      case 'code_interpreter':
        result = await handleCodeInterpreter(args);
        break;
      case 'health_check':
        result = await handleHealthCheck();
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    log('info', `Tool ${name} executed successfully`);
    
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    log('error', `Tool ${name} failed`, { error: error.message });
    
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Tool Handlers
 */

async function handleWebSearch(args) {
  const { query, provider = 'auto', depth = 'advanced', max_results = 10 } = args;
  
  const response = await sciraClient.post('/api/search/web', {
    query,
    provider,
    depth,
    maxResults: max_results,
  });
  
  return formatSearchResults(response.data, 'Web Search');
}

async function handleAcademicSearch(args) {
  const { query, max_results = 10, include_abstracts = true } = args;
  
  const response = await sciraClient.post('/api/search/academic', {
    query,
    maxResults: max_results,
    includeAbstracts: include_abstracts,
  });
  
  return formatSearchResults(response.data, 'Academic Search');
}

async function handleRedditSearch(args) {
  const { query, subreddit, time_range = 'month', max_results = 10 } = args;
  
  const response = await sciraClient.post('/api/search/reddit', {
    query,
    subreddit,
    timeRange: time_range,
    maxResults: max_results,
  });
  
  return formatSearchResults(response.data, 'Reddit Search');
}

async function handleYouTubeSearch(args) {
  const { query, max_results = 10, include_captions = true } = args;
  
  const response = await sciraClient.post('/api/search/youtube', {
    query,
    maxResults: max_results,
    includeCaptions: include_captions,
  });
  
  return formatSearchResults(response.data, 'YouTube Search');
}

async function handleExtractUrl(args) {
  const { url, include_images = false, max_length = 10000 } = args;
  
  const response = await sciraClient.post('/api/extract', {
    url,
    includeImages: include_images,
    maxLength: max_length,
  });
  
  const data = response.data;
  return `
# URL Content Extraction

**URL:** ${url}
**Title:** ${data.title || 'N/A'}
**Extracted:** ${new Date().toISOString()}

---

${data.content || data.text || 'No content extracted'}

${data.images && data.images.length > 0 ? `
---

## Images (${data.images.length})
${data.images.map(img => `- ${img}`).join('\n')}
` : ''}
  `.trim();
}

async function handleMovieSearch(args) {
  const { query, type = 'both', max_results = 10 } = args;
  
  const response = await sciraClient.post('/api/search/movies', {
    query,
    type,
    maxResults: max_results,
  });
  
  return formatSearchResults(response.data, 'Movie/TV Search');
}

async function handleWeatherSearch(args) {
  const { location, units = 'metric', include_forecast = true } = args;
  
  const response = await sciraClient.post('/api/weather', {
    location,
    units,
    includeForecast: include_forecast,
  });
  
  const data = response.data;
  return `
# Weather for ${location}

**Current Conditions:**
- Temperature: ${data.current?.temperature || 'N/A'}°${units === 'metric' ? 'C' : 'F'}
- Feels Like: ${data.current?.feelsLike || 'N/A'}°${units === 'metric' ? 'C' : 'F'}
- Humidity: ${data.current?.humidity || 'N/A'}%
- Wind: ${data.current?.windSpeed || 'N/A'} ${units === 'metric' ? 'km/h' : 'mph'}
- Conditions: ${data.current?.conditions || 'N/A'}

${data.forecast ? `
## Forecast
${data.forecast.map(day => `- **${day.date}:** ${day.conditions}, ${day.high}° / ${day.low}°`).join('\n')}
` : ''}
  `.trim();
}

async function handleStockChart(args) {
  const { symbol, period = '1mo', include_news = true } = args;
  
  const response = await sciraClient.post('/api/stocks/chart', {
    symbol: symbol.toUpperCase(),
    period,
    includeNews: include_news,
  });
  
  const data = response.data;
  return `
# Stock Chart: ${symbol.toUpperCase()}

**Current Price:** $${data.currentPrice || 'N/A'}
**Change:** ${data.change || 'N/A'} (${data.changePercent || 'N/A'}%)
**Period:** ${period}

**Chart Data:**
- High: $${data.high || 'N/A'}
- Low: $${data.low || 'N/A'}
- Volume: ${data.volume ? data.volume.toLocaleString() : 'N/A'}

${data.news && data.news.length > 0 ? `
## Recent News
${data.news.map(n => `- **${n.title}** (${n.source}, ${n.date})\n  ${n.summary || ''}`).join('\n\n')}
` : ''}

*Chart URL: ${data.chartUrl || 'N/A'}*
  `.trim();
}

async function handleAIChat(args) {
  const { message, model = 'auto', context = '' } = args;
  
  const response = await sciraClient.post('/api/chat', {
    message,
    model,
    context,
  });
  
  const data = response.data;
  return `
# AI Response

**Model Used:** ${data.model || model}
**Timestamp:** ${new Date().toISOString()}

---

${data.response || data.message || data.content || 'No response'}

${data.sources ? `
---

## Sources
${data.sources.map(s => `- ${s}`).join('\n')}
` : ''}
  `.trim();
}

async function handleCodeInterpreter(args) {
  const { code, generate_charts = true, timeout = 30 } = args;
  
  const response = await sciraClient.post('/api/code/execute', {
    code,
    generateCharts: generate_charts,
    timeout,
  });
  
  const data = response.data;
  return `
# Code Execution Result

**Status:** ${data.status || 'completed'}
**Execution Time:** ${data.executionTime || 'N/A'}ms

## Output

\`\`\`
${data.output || data.result || 'No output'}
\`\`\`

${data.charts && data.charts.length > 0 ? `
## Generated Charts
${data.charts.map(chart => `- ${chart.url || chart}`).join('\n')}
` : ''}

${data.error ? `
## Error
\`\`\`
${data.error}
\`\`\`
` : ''}
  `.trim();
}

async function handleHealthCheck() {
  const response = await sciraClient.get('/api/health');
  const data = response.data;
  
  return `
# Scira AI Search Health Status

**Status:** ${data.status || 'healthy'} ✅
**Timestamp:** ${data.timestamp || new Date().toISOString()}
**Version:** ${data.version || '1.0.0'}

${data.components ? `
## Components
${Object.entries(data.components).map(([name, status]) => `- **${name}:** ${status}`).join('\n')}
` : ''}

**API URL:** ${SCIRA_API_URL}
**Response Time:** ${data.responseTime || '< 100ms'}
  `.trim();
}

/**
 * Helper Functions
 */

function formatSearchResults(data, searchType) {
  const results = data.results || data.items || data || [];
  const summary = data.summary || data.answer || '';
  
  let output = `# ${searchType} Results\n\n`;
  
  if (summary) {
    output += `## AI Summary\n${summary}\n\n---\n\n`;
  }
  
  if (results.length === 0) {
    output += '*No results found.*';
    return output;
  }
  
  output += `## Results (${results.length})\n\n`;
  
  results.forEach((result, index) => {
    output += `### ${index + 1}. ${result.title || 'Untitled'}\n`;
    output += `**URL:** ${result.url || result.link || 'N/A'}\n`;
    
    if (result.snippet || result.description || result.content) {
      output += `\n${result.snippet || result.description || result.content}\n`;
    }
    
    if (result.author || result.published) {
      output += `\n*${result.author || ''}${result.published ? ` • ${result.published}` : ''}*`;
    }
    
    output += '\n\n';
  });
  
  return output.trim();
}

/**
 * Startup
 */
async function main() {
  log('info', 'Starting Scira MCP Wrapper', {
    apiUrl: SCIRA_API_URL,
    hasApiKey: !!SCIRA_API_KEY,
    timeout: REQUEST_TIMEOUT,
  });
  
  // Test connection to Scira
  try {
    await sciraClient.get('/api/health');
    log('info', 'Successfully connected to Scira AI Search');
  } catch (error) {
    log('warn', 'Could not connect to Scira AI Search', { error: error.message });
    log('info', 'Wrapper will start anyway and retry on requests');
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log('info', 'Scira MCP Wrapper started and listening on stdio');
}

main().catch((error) => {
  log('error', 'Fatal error in MCP Wrapper', { error: error.message });
  process.exit(1);
});

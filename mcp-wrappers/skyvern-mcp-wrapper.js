#!/usr/bin/env node
/**
 * SIN-Solver MCP Wrapper for Skyvern Visual AI
 * Container: agent-06-skyvern-solver
 * Port: 8030
 * 
 * This wrapper converts stdio (OpenCode MCP protocol) to HTTP API calls
 * to the Skyvern Visual AI container.
 * 
 * Endpoints:
 * - POST /api/v1/analyze           - Visual analysis of screenshots
 * - POST /api/v1/navigate-and-solve - Autonomous navigation with AI
 * - POST /api/v1/solve-captcha      - CAPTCHA solving
 * - POST /api/v1/totp/generate      - TOTP code generation
 * - GET  /api/health                - Health check
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
const SKYVERN_API_URL = process.env.SKYVERN_API_URL || 'http://localhost:8030';
const SKYVERN_API_KEY = process.env.SKYVERN_API_KEY || 'dev-key';
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '60000', 10);

// Create axios instance
const skyvernClient = axios.create({
  baseURL: SKYVERN_API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'SIN-Solver-MCP-Wrapper/1.0.0',
    ...(SKYVERN_API_KEY && { 'Authorization': `Bearer ${SKYVERN_API_KEY}` }),
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
    name: 'agent-06-skyvern-solver',
    version: '1.0.0',
    description: 'Skyvern Visual AI MCP - Visual web automation with AI-powered element detection',
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
    name: 'analyze_screenshot',
    description: 'Analyze a screenshot using Skyvern Visual AI to detect UI elements, login forms, CAPTCHAs, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        screenshot: {
          type: 'string',
          description: 'Base64 encoded screenshot image',
        },
        task: {
          type: 'string',
          description: 'Analysis task to perform',
          enum: ['detect_login_form', 'detect_2fa', 'detect_captcha', 'find_element', 'analyze_page'],
          default: 'analyze_page',
        },
        context: {
          type: 'string',
          description: 'Additional context for the analysis (e.g., "Looking for login button")',
        },
      },
      required: ['screenshot'],
    },
  },
  {
    name: 'navigate_and_solve',
    description: 'Autonomously navigate to a URL and perform AI-powered task solving',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
        goal: {
          type: 'string',
          description: 'Goal description for the AI (e.g., "Login with username \"john\" and password \"secret\"")',
        },
        session_context: {
          type: 'string',
          description: 'Optional session context for maintaining state',
        },
      },
      required: ['url', 'goal'],
    },
  },
  {
    name: 'solve_captcha',
    description: 'Solve visual CAPTCHA using Skyvern AI',
    inputSchema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          description: 'Base64 encoded CAPTCHA image',
        },
        type: {
          type: 'string',
          description: 'CAPTCHA type',
          enum: ['recaptcha', 'hcaptcha', 'image', 'audio', 'text'],
          default: 'image',
        },
        instructions: {
          type: 'string',
          description: 'Instructions for solving (e.g., "Select all images with cars")',
        },
      },
      required: ['image'],
    },
  },
  {
    name: 'generate_totp',
    description: 'Generate TOTP code for 2FA authentication',
    inputSchema: {
      type: 'object',
      properties: {
        secret: {
          type: 'string',
          description: 'TOTP secret key (Base32 encoded)',
        },
      },
      required: ['secret'],
    },
  },
  {
    name: 'extract_coordinates',
    description: 'Extract click coordinates for elements on a page',
    inputSchema: {
      type: 'object',
      properties: {
        screenshot: {
          type: 'string',
          description: 'Base64 encoded screenshot',
        },
        element_description: {
          type: 'string',
          description: 'Description of the element to find (e.g., "Login button")',
        },
      },
      required: ['screenshot', 'element_description'],
    },
  },
  {
    name: 'detect_login_form',
    description: 'Detect login form elements on a page',
    inputSchema: {
      type: 'object',
      properties: {
        screenshot: {
          type: 'string',
          description: 'Base64 encoded screenshot of the page',
        },
      },
      required: ['screenshot'],
    },
  },
  {
    name: 'detect_2fa',
    description: 'Detect 2FA/MFA challenge on a page',
    inputSchema: {
      type: 'object',
      properties: {
        screenshot: {
          type: 'string',
          description: 'Base64 encoded screenshot',
        },
      },
      required: ['screenshot'],
    },
  },
  {
    name: 'health_check',
    description: 'Check the health status of the Skyvern service',
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
  
  log('info', `Executing tool: ${name}`, { args: Object.keys(args) });
  
  try {
    let result;
    
    switch (name) {
      case 'analyze_screenshot':
        result = await handleAnalyzeScreenshot(args);
        break;
      case 'navigate_and_solve':
        result = await handleNavigateAndSolve(args);
        break;
      case 'solve_captcha':
        result = await handleSolveCaptcha(args);
        break;
      case 'generate_totp':
        result = await handleGenerateTOTP(args);
        break;
      case 'extract_coordinates':
        result = await handleExtractCoordinates(args);
        break;
      case 'detect_login_form':
        result = await handleDetectLoginForm(args);
        break;
      case 'detect_2fa':
        result = await handleDetect2FA(args);
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

async function handleAnalyzeScreenshot(args) {
  const { screenshot, task = 'analyze_page', context = '' } = args;
  
  const response = await skyvernClient.post('/api/v1/analyze', {
    screenshot,
    task,
    context,
  });
  
  return formatAnalysisResult(response.data);
}

async function handleNavigateAndSolve(args) {
  const { url, goal, session_context = '' } = args;
  
  const response = await skyvernClient.post('/api/v1/navigate-and-solve', {
    url,
    goal,
    session_context,
  });
  
  const data = response.data;
  return `
# Skyvern Navigation Result

**URL:** ${url}
**Goal:** ${goal}
**Status:** ${data.success ? '✅ Success' : '❌ Failed'}

${data.session_id ? `**Session ID:** ${data.session_id}` : ''}

${data.actions ? `
## Actions Performed (${data.actions.length})
${data.actions.map((a, i) => `${i + 1}. ${a.description} ${a.success ? '✅' : '❌'}`).join('\n')}
` : ''}

${data.result ? `
## Result
${typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2)}
` : ''}

${data.error ? `
## Error
${data.error}
` : ''}
  `.trim();
}

async function handleSolveCaptcha(args) {
  const { image, type = 'image', instructions = '' } = args;
  
  const response = await skyvernClient.post('/api/v1/solve-captcha', {
    image,
    type,
    instructions,
  });
  
  const data = response.data;
  return `
# CAPTCHA Solution

**Type:** ${type}
**Success:** ${data.success ? '✅' : '❌'}

## Solution
${data.solution || 'No solution provided'}

${data.confidence ? `**Confidence:** ${(data.confidence * 100).toFixed(1)}%` : ''}
${data.method ? `**Method:** ${data.method}` : ''}

${data.error ? `**Error:** ${data.error}` : ''}
  `.trim();
}

async function handleGenerateTOTP(args) {
  const { secret } = args;
  
  const response = await skyvernClient.post('/api/v1/totp/generate', {
    secret,
  });
  
  const data = response.data;
  return `
# TOTP Code Generated

**Code:** \`\`\`${data.code}\`\`\`
**Expires In:** ${data.expires_in || '30'} seconds
**Generated At:** ${new Date().toISOString()}
  `.trim();
}

async function handleExtractCoordinates(args) {
  const { screenshot, element_description } = args;
  
  const response = await skyvernClient.post('/api/v1/extract-coordinates', {
    screenshot,
    element_description,
  });
  
  const data = response.data;
  return `
# Element Coordinates

**Element:** ${element_description}
**Found:** ${data.found ? '✅ Yes' : '❌ No'}

${data.found ? `
**Coordinates:**
- X: ${data.x}
- Y: ${data.y}
- Width: ${data.width || 'N/A'}
- Height: ${data.height || 'N/A'}

**Confidence:** ${(data.confidence * 100).toFixed(1)}%

**Selector (optional):** ${data.selector || 'N/A'}
` : `**Reason:** ${data.reason || 'Element not found in screenshot'}`}
  `.trim();
}

async function handleDetectLoginForm(args) {
  const { screenshot } = args;
  
  const response = await skyvernClient.post('/api/v1/analyze', {
    screenshot,
    task: 'detect_login_form',
  });
  
  const data = response.data;
  return `
# Login Form Detection

**Detected:** ${data.hasLoginForm ? '✅ Yes' : '❌ No'}
${data.confidence ? `**Confidence:** ${(data.confidence * 100).toFixed(1)}%` : ''}

${data.hasLoginForm ? `
## Form Elements

${data.usernameSelector ? `- **Username Field:** ${data.usernameSelector}` : ''}
${data.passwordSelector ? `- **Password Field:** ${data.passwordSelector}` : ''}
${data.submitSelector ? `- **Submit Button:** ${data.submitSelector}` : ''}
${data.rememberMeSelector ? `- **Remember Me:** ${data.rememberMeSelector}` : ''}
${data.forgotPasswordSelector ? `- **Forgot Password:** ${data.forgotPasswordSelector}` : ''}

**Form Type:** ${data.formType || 'standard'}
` : 'No login form detected in the screenshot.'}
  `.trim();
}

async function handleDetect2FA(args) {
  const { screenshot } = args;
  
  const response = await skyvernClient.post('/api/v1/analyze', {
    screenshot,
    task: 'detect_2fa',
  });
  
  const data = response.data;
  return `
# 2FA Detection

**Detected:** ${data.has2FA ? '⚠️ Yes' : '✅ No 2FA detected'}
${data.confidence ? `**Confidence:** ${(data.confidence * 100).toFixed(1)}%` : ''}

${data.has2FA ? `
## 2FA Details

**Type:** ${data.method || 'unknown'} (${data.method === 'totp' ? 'TOTP/App' : data.method === 'sms' ? 'SMS' : data.method === 'email' ? 'Email' : 'Other'})

**Input Fields:**
${data.codeInputSelector ? `- **Code Input:** ${data.codeInputSelector}` : ''}
${data.submitSelector ? `- **Submit Button:** ${data.submitSelector}` : ''}
${data.resendSelector ? `- **Resend Code:** ${data.resendSelector}` : ''}

${data.instructions ? `**Instructions:** ${data.instructions}` : ''}
` : ''}
  `.trim();
}

async function handleHealthCheck() {
  try {
    const response = await skyvernClient.get('/api/health');
    const data = response.data;
    
    return `
# Skyvern Visual AI Health Status

**Status:** ${data.status === 'healthy' ? '✅ Healthy' : '⚠️ Degraded'}
**Timestamp:** ${data.timestamp || new Date().toISOString()}
**Version:** ${data.version || '1.0.0'}

**API URL:** ${SKYVERN_API_URL}

${data.components ? `
## Components
${Object.entries(data.components).map(([name, status]) => `- **${name}:** ${status}`).join('\n')}
` : ''}

${data.metrics ? `
## Metrics
- **Uptime:** ${data.metrics.uptime || 'N/A'}
- **Requests Processed:** ${data.metrics.requests || 'N/A'}
- **Avg Response Time:** ${data.metrics.avgResponseTime || 'N/A'}
` : ''}
    `.trim();
  } catch (error) {
    return `
# Skyvern Visual AI Health Status

**Status:** ❌ Unreachable
**Error:** ${error.message}
**API URL:** ${SKYVERN_API_URL}

The Skyvern container may not be running. Start it with:
\`\`\`bash
docker run -d --name agent-06-skyvern-solver -p 8030:8000 skyvern/skyvern:latest
\`\`\`
    `.trim();
  }
}

/**
 * Helper Functions
 */

function formatAnalysisResult(data) {
  return `
# Skyvern Visual Analysis

**Task:** ${data.task || 'analyze_page'}
**Success:** ${data.success !== false ? '✅' : '❌'}

${data.summary ? `
## Summary
${data.summary}
` : ''}

${data.elements && data.elements.length > 0 ? `
## Detected Elements (${data.elements.length})
${data.elements.map((el, i) => {
  return `${i + 1}. **${el.type || 'Element'}** - ${el.description || 'No description'}
   ${el.selector ? `   - Selector: \`${el.selector}\`` : ''}
   ${el.coordinates ? `   - Coordinates: (${el.coordinates.x}, ${el.coordinates.y})` : ''}
   ${el.confidence ? `   - Confidence: ${(el.confidence * 100).toFixed(1)}%` : ''}`;
}).join('\n')}
` : ''}

${data.raw ? `
## Raw Output
\`\`\`json
${JSON.stringify(data.raw, null, 2)}
\`\`\`
` : ''}
  `.trim();
}

/**
 * Startup
 */
async function main() {
  log('info', 'Starting Skyvern MCP Wrapper', {
    apiUrl: SKYVERN_API_URL,
    hasApiKey: !!SKYVERN_API_KEY,
    timeout: REQUEST_TIMEOUT,
  });
  
  // Test connection to Skyvern
  try {
    await skyvernClient.get('/api/health');
    log('info', 'Successfully connected to Skyvern Visual AI');
  } catch (error) {
    log('warn', 'Could not connect to Skyvern Visual AI', { error: error.message });
    log('info', 'Wrapper will start anyway and retry on requests');
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log('info', 'Skyvern MCP Wrapper started and listening on stdio');
}

main().catch((error) => {
  log('error', 'Fatal error in MCP Wrapper', { error: error.message });
  process.exit(1);
});

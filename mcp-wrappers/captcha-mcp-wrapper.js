#!/usr/bin/env node
/**
 * Captcha Solver MCP Wrapper
 * Konvertiert Captcha Worker HTTP API zu MCP stdio Protocol
 * 
 * Verbindung: solver-19-captcha-worker:8019
 * Usage: Add to opencode.json as local MCP
 * 
 * Environment Variables:
 *   CAPTCHA_API_URL - Base URL (default: http://localhost:8019)
 *   CAPTCHA_API_KEY - API Key for authentication
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const CAPTCHA_API_URL = process.env.CAPTCHA_API_URL || 'http://localhost:8019';
const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY;

// Create axios instance with default config
const captchaClient = axios.create({
  baseURL: CAPTCHA_API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    ...(CAPTCHA_API_KEY && { 'Authorization': `Bearer ${CAPTCHA_API_KEY}` })
  }
});

const server = new Server(
  {
    name: 'captcha-mcp-wrapper',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Solve text-based CAPTCHA using multi-AI consensus
 * Supports: OCR text recognition, ddddocr, Gemini Vision
 */
async function solveTextCaptcha(imageBase64, timeout = 30) {
  const response = await captchaClient.post('/api/solve/text', {
    image_base64: imageBase64,
    timeout: timeout,
    consensus_required: true
  });
  return response.data;
}

/**
 * Solve image grid CAPTCHA (hCaptcha/reCAPTCHA image selection)
 * Supports: 3x3 and 4x4 grids, YOLOv8 object detection
 */
async function solveImageCaptcha(imageBase64, instructions, gridSize = '3x3') {
  const response = await captchaClient.post('/api/solve/image', {
    image_base64: imageBase64,
    instructions: instructions,
    grid_size: gridSize,
    detection_model: 'yolov8'
  });
  return response.data;
}

/**
 * Solve CAPTCHA on a live webpage using Steel Browser
 * Supports: reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile
 */
async function solveWithBrowser(url, captchaType = 'auto', waitForResult = true) {
  const response = await captchaClient.post('/api/solve/browser', {
    url: url,
    captcha_type: captchaType,
    wait_for_result: waitForResult,
    stealth_mode: true,
    human_simulation: true
  });
  return response.data;
}

/**
 * Get status of all solver components
 * Returns: health status, active tasks, model availability
 */
async function getSolverStatus() {
  const response = await captchaClient.get('/api/status');
  return response.data;
}

/**
 * Check current rate limit status
 * Returns: requests used, requests remaining, reset time
 */
async function checkRateLimits() {
  const response = await captchaClient.get('/api/rate-limits');
  return response.data;
}

/**
 * Get solver statistics and performance metrics
 * Returns: solve rates, average latency, cost per solve
 */
async function getSolverStats() {
  const response = await captchaClient.get('/api/stats');
  return response.data;
}

/**
 * Solve slider CAPTCHA (drag-to-unlock style)
 * Supports: Slider verification, distance calculation
 */
async function solveSliderCaptcha(imageBase64, timeout = 30) {
  const response = await captchaClient.post('/api/solve/slider', {
    image_base64: imageBase64,
    timeout: timeout
  });
  return response.data;
}

/**
 * Solve audio CAPTCHA using Whisper speech-to-text
 * Supports: MP3, WAV, OGG audio formats
 */
async function solveAudioCaptcha(audioBase64, audioFormat = 'mp3', timeout = 30) {
  const response = await captchaClient.post('/api/solve/audio', {
    audio_base64: audioBase64,
    audio_format: audioFormat,
    timeout: timeout
  });
  return response.data;
}

/**
 * Solve click-order CAPTCHA (click items in specific order)
 * Supports: Sequential click detection, image analysis
 */
async function solveClickOrderCaptcha(imageBase64, instructions, timeout = 30) {
  const response = await captchaClient.post('/api/solve/click-order', {
    image_base64: imageBase64,
    instructions: instructions,
    timeout: timeout
  });
  return response.data;
}

/**
 * Get detailed information about a specific solve task
 * Returns: task status, solution, metadata, cost
 */
async function getSolveTaskInfo(taskId) {
  const response = await captchaClient.get(`/api/tasks/${taskId}`);
  return response.data;
}

// ============================================================================
// MCP REQUEST HANDLERS
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'solve_text_captcha',
        description: 'Solve text-based CAPTCHA using multi-AI consensus (OCR, ddddocr, Gemini)',
        inputSchema: {
          type: 'object',
          properties: {
            image_base64: {
              type: 'string',
              description: 'Base64 encoded CAPTCHA image'
            },
            timeout: {
              type: 'number',
              default: 30,
              description: 'Timeout in seconds'
            }
          },
          required: ['image_base64']
        }
      },
      {
        name: 'solve_image_captcha',
        description: 'Solve image grid CAPTCHA (hCaptcha/reCAPTCHA style) using YOLOv8 detection',
        inputSchema: {
          type: 'object',
          properties: {
            image_base64: {
              type: 'string',
              description: 'Base64 encoded CAPTCHA grid image'
            },
            instructions: {
              type: 'string',
              description: 'Instructions for what to select (e.g., "Select all cars")'
            },
            grid_size: {
              type: 'string',
              enum: ['3x3', '4x4'],
              default: '3x3',
              description: 'Grid size of the CAPTCHA'
            }
          },
          required: ['image_base64', 'instructions']
        }
      },
      {
        name: 'solve_with_browser',
        description: 'Solve CAPTCHA on a live webpage using Steel Browser with stealth mode',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL with CAPTCHA to solve'
            },
            captcha_type: {
              type: 'string',
              enum: ['recaptcha_v2', 'recaptcha_v3', 'hcaptcha', 'turnstile', 'auto'],
              default: 'auto',
              description: 'Type of CAPTCHA on the page'
            },
            wait_for_result: {
              type: 'boolean',
              default: true,
              description: 'Wait for solution before returning'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'solve_slider_captcha',
        description: 'Solve slider CAPTCHA (drag-to-unlock style)',
        inputSchema: {
          type: 'object',
          properties: {
            image_base64: {
              type: 'string',
              description: 'Base64 encoded slider CAPTCHA image'
            },
            timeout: {
              type: 'number',
              default: 30,
              description: 'Timeout in seconds'
            }
          },
          required: ['image_base64']
        }
      },
      {
        name: 'solve_audio_captcha',
        description: 'Solve audio CAPTCHA using Whisper speech-to-text',
        inputSchema: {
          type: 'object',
          properties: {
            audio_base64: {
              type: 'string',
              description: 'Base64 encoded audio file'
            },
            audio_format: {
              type: 'string',
              enum: ['mp3', 'wav', 'ogg', 'm4a'],
              default: 'mp3',
              description: 'Audio format'
            },
            timeout: {
              type: 'number',
              default: 30,
              description: 'Timeout in seconds'
            }
          },
          required: ['audio_base64']
        }
      },
      {
        name: 'solve_click_order_captcha',
        description: 'Solve click-order CAPTCHA (click items in specific sequence)',
        inputSchema: {
          type: 'object',
          properties: {
            image_base64: {
              type: 'string',
              description: 'Base64 encoded click-order CAPTCHA image'
            },
            instructions: {
              type: 'string',
              description: 'Instructions for click order (e.g., "Click in order: car, tree, person")'
            },
            timeout: {
              type: 'number',
              default: 30,
              description: 'Timeout in seconds'
            }
          },
          required: ['image_base64', 'instructions']
        }
      },
      {
        name: 'get_solver_status',
        description: 'Get status of all solver components (health, active tasks, model availability)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'check_rate_limits',
        description: 'Check current rate limit status (requests used, remaining, reset time)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_solver_stats',
        description: 'Get solver statistics and performance metrics (solve rates, latency, cost)',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_solve_task_info',
        description: 'Get detailed information about a specific solve task',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID returned from a solve request'
            }
          },
          required: ['task_id']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'solve_text_captcha':
        result = await solveTextCaptcha(args.image_base64, args.timeout);
        break;

      case 'solve_image_captcha':
        result = await solveImageCaptcha(args.image_base64, args.instructions, args.grid_size);
        break;

      case 'solve_with_browser':
        result = await solveWithBrowser(args.url, args.captcha_type, args.wait_for_result);
        break;

      case 'solve_slider_captcha':
        result = await solveSliderCaptcha(args.image_base64, args.timeout);
        break;

      case 'solve_audio_captcha':
        result = await solveAudioCaptcha(args.audio_base64, args.audio_format, args.timeout);
        break;

      case 'solve_click_order_captcha':
        result = await solveClickOrderCaptcha(args.image_base64, args.instructions, args.timeout);
        break;

      case 'get_solver_status':
        result = await getSolverStatus();
        break;

      case 'check_rate_limits':
        result = await checkRateLimits();
        break;

      case 'get_solver_stats':
        result = await getSolverStats();
        break;

      case 'get_solve_task_info':
        result = await getSolveTaskInfo(args.task_id);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      toolResult: result
    };

  } catch (error) {
    // Proper MCP error response
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
    const statusCode = error.response?.status || 500;

    return {
      content: [{
        type: 'text',
        text: `Error (${statusCode}): ${errorMessage}`
      }],
      isError: true
    };
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);

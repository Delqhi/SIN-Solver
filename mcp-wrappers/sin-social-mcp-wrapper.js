#!/usr/bin/env node
/**
 * SIN Social MCP Wrapper
 * Konvertiert SIN Social HTTP API zu MCP stdio Protocol
 * Service: room-20.3-sin-social-mcp (Port 8203)
 * API: https://social.delqhi.com
 * 
 * Tools:
 * - analyze_video: AI video content analysis with Gemini
 * - post_to_clawdbot: Cross-platform posting via ClawdBot
 * - analyze_and_post: Analyze + generate post + publish
 * - schedule_post: Schedule posts for later
 * - get_post_status: Track post performance
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const API_URL = process.env.SIN_SOCIAL_API_URL || 'https://social.delqhi.com';
const API_KEY = process.env.SIN_SOCIAL_API_KEY;

const client = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
  }
});

const server = new Server(
  { name: 'sin-social-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Tool: Analyze Video
async function analyzeVideo(videoUrl, analysisType = 'full') {
  const response = await client.post('/api/analyze', {
    video_url: videoUrl,
    analysis_type: analysisType // 'summary', 'transcript', 'full'
  });
  return response.data;
}

// Tool: Post to Clawdbot
async function postToClawdbot(content, platforms = [], mediaUrls = []) {
  const response = await client.post('/api/post', {
    content,
    platforms, // ['twitter', 'linkedin', 'facebook', 'instagram']
    media_urls: mediaUrls
  });
  return response.data;
}

// Tool: Analyze and Post
async function analyzeAndPost(videoUrl, platforms = [], customCaption = null) {
  const response = await client.post('/api/analyze-and-post', {
    video_url: videoUrl,
    platforms,
    custom_caption: customCaption
  });
  return response.data;
}

// Tool: Schedule Post
async function schedulePost(content, platforms = [], scheduledTime, mediaUrls = []) {
  const response = await client.post('/api/schedule', {
    content,
    platforms,
    scheduled_time: scheduledTime, // ISO 8601 format
    media_urls: mediaUrls
  });
  return response.data;
}

// Tool: Get Post Status
async function getPostStatus(postId) {
  const response = await client.get(`/api/post/${postId}/status`);
  return response.data;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'analyze_video',
        description: 'Analyze video content with Gemini AI (FREE)',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL to analyze' },
            analysisType: { 
              type: 'string', 
              description: 'Type of analysis',
              enum: ['summary', 'transcript', 'full'],
              default: 'full'
            }
          },
          required: ['videoUrl']
        }
      },
      {
        name: 'post_to_clawdbot',
        description: 'Post content to social media via ClawdBot',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Post content/text' },
            platforms: { 
              type: 'array', 
              description: 'Platforms to post to',
              items: { type: 'string', enum: ['twitter', 'linkedin', 'facebook', 'instagram'] },
              default: ['twitter']
            },
            mediaUrls: { 
              type: 'array', 
              description: 'Media URLs to attach',
              items: { type: 'string' },
              default: []
            }
          },
          required: ['content']
        }
      },
      {
        name: 'analyze_and_post',
        description: 'Analyze video + generate post + publish automatically',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL to analyze and post' },
            platforms: { 
              type: 'array', 
              description: 'Platforms to post to',
              items: { type: 'string', enum: ['twitter', 'linkedin', 'facebook', 'instagram'] },
              default: ['twitter']
            },
            customCaption: { 
              type: 'string', 
              description: 'Optional custom caption (overrides AI-generated)',
              default: null
            }
          },
          required: ['videoUrl']
        }
      },
      {
        name: 'schedule_post',
        description: 'Schedule a post for later publication',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Post content' },
            platforms: { 
              type: 'array', 
              description: 'Platforms to post to',
              items: { type: 'string' },
              default: ['twitter']
            },
            scheduledTime: { 
              type: 'string', 
              description: 'Schedule time (ISO 8601 format, e.g., 2026-01-30T10:00:00Z)'
            },
            mediaUrls: { 
              type: 'array', 
              description: 'Media URLs',
              items: { type: 'string' },
              default: []
            }
          },
          required: ['content', 'scheduledTime']
        }
      },
      {
        name: 'get_post_status',
        description: 'Get status and analytics of a published post',
        inputSchema: {
          type: 'object',
          properties: {
            postId: { type: 'string', description: 'Post ID to check' }
          },
          required: ['postId']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'analyze_video':
        return { toolResult: await analyzeVideo(args.videoUrl, args.analysisType) };
      case 'post_to_clawdbot':
        return { toolResult: await postToClawdbot(args.content, args.platforms, args.mediaUrls) };
      case 'analyze_and_post':
        return { toolResult: await analyzeAndPost(args.videoUrl, args.platforms, args.customCaption) };
      case 'schedule_post':
        return { toolResult: await schedulePost(args.content, args.platforms, args.scheduledTime, args.mediaUrls) };
      case 'get_post_status':
        return { toolResult: await getPostStatus(args.postId) };
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

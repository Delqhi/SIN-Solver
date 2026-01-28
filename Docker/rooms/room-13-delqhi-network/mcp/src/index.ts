import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { config } from './config.js';
import * as tools from './tools/index.js';

const server = new Server(
  { name: 'delqhi-mcp', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_post',
      description: 'Create a new post on Delqhi Network',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Post content (max 10000 chars)' },
          visibility: { type: 'string', enum: ['public', 'followers', 'private'], default: 'public' },
        },
        required: ['content'],
      },
    },
    {
      name: 'get_timeline',
      description: 'Get the home timeline feed',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of posts to fetch', default: 20 },
          cursor: { type: 'string', description: 'Pagination cursor' },
        },
      },
    },
    {
      name: 'search_posts',
      description: 'Search for posts by content',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', default: 20 },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_user_profile',
      description: 'Get a user profile by username',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Username to look up' },
        },
        required: ['username'],
      },
    },
    {
      name: 'follow_user',
      description: 'Follow a user',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to follow' },
        },
        required: ['userId'],
      },
    },
    {
      name: 'unfollow_user',
      description: 'Unfollow a user',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to unfollow' },
        },
        required: ['userId'],
      },
    },
    {
      name: 'like_post',
      description: 'Like a post',
      inputSchema: {
        type: 'object',
        properties: {
          postId: { type: 'string', description: 'Post ID to like' },
        },
        required: ['postId'],
      },
    },
    {
      name: 'send_message',
      description: 'Send a direct message to a user',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'Recipient user ID' },
          content: { type: 'string', description: 'Message content' },
        },
        required: ['userId', 'content'],
      },
    },
    {
      name: 'get_trending',
      description: 'Get trending hashtags',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 10 },
        },
      },
    },
    {
      name: 'get_notifications',
      description: 'Get user notifications',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20 },
          unreadOnly: { type: 'boolean', default: false },
        },
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'create_post':
        return await tools.createPost(args as { content: string; visibility?: string });
      case 'get_timeline':
        return await tools.getTimeline(args as { limit?: number; cursor?: string });
      case 'search_posts':
        return await tools.searchPosts(args as { query: string; limit?: number });
      case 'get_user_profile':
        return await tools.getUserProfile(args as { username: string });
      case 'follow_user':
        return await tools.followUser(args as { userId: string });
      case 'unfollow_user':
        return await tools.unfollowUser(args as { userId: string });
      case 'like_post':
        return await tools.likePost(args as { postId: string });
      case 'send_message':
        return await tools.sendMessage(args as { userId: string; content: string });
      case 'get_trending':
        return await tools.getTrending(args as { limit?: number });
      case 'get_notifications':
        return await tools.getNotifications(args as { limit?: number; unreadOnly?: boolean });
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
});

// List resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'delqhi://user/me',
      name: 'Current User Profile',
      description: 'The authenticated user profile',
      mimeType: 'application/json',
    },
    {
      uri: 'delqhi://trending',
      name: 'Trending Topics',
      description: 'Current trending hashtags and topics',
      mimeType: 'application/json',
    },
  ],
}));

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri === 'delqhi://user/me') {
    const profile = await tools.getCurrentUser();
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(profile) }] };
  }
  
  if (uri === 'delqhi://trending') {
    const trending = await tools.getTrending({ limit: 10 });
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(trending) }] };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Delqhi MCP server running on stdio');
}

main().catch(console.error);

#!/usr/bin/env node
/**
 * SIN Video Gen MCP Wrapper
 * Konvertiert SIN Video Generation HTTP API zu MCP stdio Protocol
 * Service: room-20.5-sin-video-mcp (Port 8205)
 * API: https://video.delqhi.com
 * 
 * Tools:
 * - generate_video: Create video from images with transitions (FFmpeg)
 * - add_logo: Overlay logo/watermark
 * - add_subtitles: Burn subtitles into video
 * - add_voiceover: TTS voice-over using Edge TTS (FREE)
 * - resize_video: Multiple formats (16:9, 9:16, 1:1, 4:3, 21:9)
 * - add_text_overlay: Animated text graphics
 * - trim_video: Adjust video length
 * - merge_videos: Combine multiple clips
 * - generate_thumbnail: Create video thumbnails
 * - extract_audio: Extract audio track
 * - generate_script: AI-generated video scripts
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');

const API_URL = process.env.SIN_VIDEO_API_URL || 'https://video.delqhi.com';
const API_KEY = process.env.SIN_VIDEO_API_KEY;

const client = axios.create({
  baseURL: API_URL,
  timeout: 300000, // 5 minutes for video processing
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
  }
});

const server = new Server(
  { name: 'sin-video-gen-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Tool: Generate Video
async function generateVideo(imageUrls, options = {}) {
  const response = await client.post('/api/generate', {
    images: imageUrls,
    transition: options.transition || 'fade',
    duration: options.duration || 5,
    music: options.music || null,
    output_format: options.outputFormat || 'mp4'
  });
  return response.data;
}

// Tool: Add Logo
async function addLogo(videoUrl, logoUrl, position = 'bottom-right') {
  const response = await client.post('/api/add-logo', {
    video_url: videoUrl,
    logo_url: logoUrl,
    position // 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
  });
  return response.data;
}

// Tool: Add Subtitles
async function addSubtitles(videoUrl, subtitlesText, style = 'default') {
  const response = await client.post('/api/add-subtitles', {
    video_url: videoUrl,
    subtitles: subtitlesText,
    style // 'default', 'minimal', 'bold', 'karaoke'
  });
  return response.data;
}

// Tool: Add Voiceover
async function addVoiceover(videoUrl, text, voice = 'en-US-AriaNeural', language = 'en') {
  const response = await client.post('/api/add-voiceover', {
    video_url: videoUrl,
    text,
    voice, // Microsoft Edge TTS voices
    language
  });
  return response.data;
}

// Tool: Resize Video
async function resizeVideo(videoUrl, aspectRatio) {
  const response = await client.post('/api/resize', {
    video_url: videoUrl,
    aspect_ratio: aspectRatio // '16:9', '9:16', '1:1', '4:3', '21:9'
  });
  return response.data;
}

// Tool: Add Text Overlay
async function addTextOverlay(videoUrl, text, options = {}) {
  const response = await client.post('/api/add-text', {
    video_url: videoUrl,
    text,
    position: options.position || 'center',
    font_size: options.fontSize || 48,
    color: options.color || 'white',
    animation: options.animation || 'fade' // 'fade', 'slide', 'bounce', 'none'
  });
  return response.data;
}

// Tool: Trim Video
async function trimVideo(videoUrl, startTime, endTime) {
  const response = await client.post('/api/trim', {
    video_url: videoUrl,
    start_time: startTime, // seconds
    end_time: endTime // seconds
  });
  return response.data;
}

// Tool: Merge Videos
async function mergeVideos(videoUrls, transition = 'fade') {
  const response = await client.post('/api/merge', {
    videos: videoUrls,
    transition
  });
  return response.data;
}

// Tool: Generate Thumbnail
async function generateThumbnail(videoUrl, time = 0) {
  const response = await client.post('/api/thumbnail', {
    video_url: videoUrl,
    time // seconds from start
  });
  return response.data;
}

// Tool: Extract Audio
async function extractAudio(videoUrl, format = 'mp3') {
  const response = await client.post('/api/extract-audio', {
    video_url: videoUrl,
    format // 'mp3', 'wav', 'aac'
  });
  return response.data;
}

// Tool: Generate Script
async function generateScript(topic, duration = 60, tone = 'professional') {
  const response = await client.post('/api/generate-script', {
    topic,
    duration, // seconds
    tone // 'professional', 'casual', 'dramatic', 'funny'
  });
  return response.data;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_video',
        description: 'Create video from images with transitions (FFmpeg, FREE)',
        inputSchema: {
          type: 'object',
          properties: {
            imageUrls: { 
              type: 'array', 
              description: 'List of image URLs',
              items: { type: 'string' }
            },
            options: {
              type: 'object',
              properties: {
                transition: { type: 'string', default: 'fade' },
                duration: { type: 'number', description: 'Seconds per image', default: 5 },
                music: { type: 'string', description: 'Background music URL' },
                outputFormat: { type: 'string', default: 'mp4' }
              }
            }
          },
          required: ['imageUrls']
        }
      },
      {
        name: 'add_logo',
        description: 'Overlay logo/watermark on video',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL' },
            logoUrl: { type: 'string', description: 'Logo image URL' },
            position: { 
              type: 'string', 
              enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
              default: 'bottom-right'
            }
          },
          required: ['videoUrl', 'logoUrl']
        }
      },
      {
        name: 'add_subtitles',
        description: 'Burn subtitles into video (ASS/SRT format)',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL' },
            subtitlesText: { type: 'string', description: 'Subtitles in SRT format' },
            style: { type: 'string', enum: ['default', 'minimal', 'bold', 'karaoke'], default: 'default' }
          },
          required: ['videoUrl', 'subtitlesText']
        }
      },
      {
        name: 'add_voiceover',
        description: 'Add TTS voice-over using Microsoft Edge TTS (FREE, 10+ languages)',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL' },
            text: { type: 'string', description: 'Text to speak' },
            voice: { type: 'string', default: 'en-US-AriaNeural' },
            language: { type: 'string', default: 'en' }
          },
          required: ['videoUrl', 'text']
        }
      },
      {
        name: 'resize_video',
        description: 'Resize video to different aspect ratios',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL' },
            aspectRatio: { 
              type: 'string', 
              enum: ['16:9', '9:16', '1:1', '4:3', '21:9'],
              description: 'Target aspect ratio'
            }
          },
          required: ['videoUrl', 'aspectRatio']
        }
      },
      {
        name: 'add_text_overlay',
        description: 'Add animated text overlay to video',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL' },
            text: { type: 'string', description: 'Text to overlay' },
            options: {
              type: 'object',
              properties: {
                position: { type: 'string', default: 'center' },
                fontSize: { type: 'number', default: 48 },
                color: { type: 'string', default: 'white' },
                animation: { type: 'string', enum: ['fade', 'slide', 'bounce', 'none'], default: 'fade' }
              }
            }
          },
          required: ['videoUrl', 'text']
        }
      },
      {
        name: 'trim_video',
        description: 'Trim video to specific start/end times',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL' },
            startTime: { type: 'number', description: 'Start time in seconds' },
            endTime: { type: 'number', description: 'End time in seconds' }
          },
          required: ['videoUrl', 'startTime', 'endTime']
        }
      },
      {
        name: 'merge_videos',
        description: 'Combine multiple video clips with transitions',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrls: { type: 'array', items: { type: 'string' }, description: 'Video URLs to merge' },
            transition: { type: 'string', default: 'fade' }
          },
          required: ['videoUrls']
        }
      },
      {
        name: 'generate_thumbnail',
        description: 'Generate thumbnail from video',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL' },
            time: { type: 'number', description: 'Time in seconds', default: 0 }
          },
          required: ['videoUrl']
        }
      },
      {
        name: 'extract_audio',
        description: 'Extract audio track from video',
        inputSchema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'Video URL' },
            format: { type: 'string', enum: ['mp3', 'wav', 'aac'], default: 'mp3' }
          },
          required: ['videoUrl']
        }
      },
      {
        name: 'generate_script',
        description: 'Generate AI video script using Gemini (FREE)',
        inputSchema: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'Video topic' },
            duration: { type: 'number', description: 'Target duration in seconds', default: 60 },
            tone: { type: 'string', enum: ['professional', 'casual', 'dramatic', 'funny'], default: 'professional' }
          },
          required: ['topic']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_video':
        return { toolResult: await generateVideo(args.imageUrls, args.options) };
      case 'add_logo':
        return { toolResult: await addLogo(args.videoUrl, args.logoUrl, args.position) };
      case 'add_subtitles':
        return { toolResult: await addSubtitles(args.videoUrl, args.subtitlesText, args.style) };
      case 'add_voiceover':
        return { toolResult: await addVoiceover(args.videoUrl, args.text, args.voice, args.language) };
      case 'resize_video':
        return { toolResult: await resizeVideo(args.videoUrl, args.aspectRatio) };
      case 'add_text_overlay':
        return { toolResult: await addTextOverlay(args.videoUrl, args.text, args.options) };
      case 'trim_video':
        return { toolResult: await trimVideo(args.videoUrl, args.startTime, args.endTime) };
      case 'merge_videos':
        return { toolResult: await mergeVideos(args.videoUrls, args.transition) };
      case 'generate_thumbnail':
        return { toolResult: await generateThumbnail(args.videoUrl, args.time) };
      case 'extract_audio':
        return { toolResult: await extractAudio(args.videoUrl, args.format) };
      case 'generate_script':
        return { toolResult: await generateScript(args.topic, args.duration, args.tone) };
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

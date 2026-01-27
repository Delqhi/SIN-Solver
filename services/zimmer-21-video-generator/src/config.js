/**
 * Zimmer-21: Video Generator Configuration
 * All environment variables and constants
 */

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 8021,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // OpenCode Zen API (FREE)
  opencode: {
    apiUrl: process.env.OPENCODE_API_URL || 'https://api.opencode.ai/v1/chat/completions',
    apiKey: process.env.OPENCODE_API_KEY || '',
    model: process.env.OPENCODE_MODEL || 'zen/coder-pro',
    maxTokens: parseInt(process.env.OPENCODE_MAX_TOKENS, 10) || 2048
  },

  // Edge-TTS Configuration (FREE Microsoft TTS)
  tts: {
    defaultVoice: process.env.TTS_VOICE || 'de-DE-KatjaNeural',
    alternativeVoices: [
      'de-DE-KatjaNeural',
      'de-DE-ConradNeural',
      'de-DE-AmalaNeural',
      'en-US-JennyNeural',
      'en-US-GuyNeural'
    ],
    outputFormat: 'mp3',
    rate: process.env.TTS_RATE || '+0%',
    volume: process.env.TTS_VOLUME || '+0%'
  },

  // FFmpeg Configuration
  ffmpeg: {
    inputPath: process.env.FFMPEG_INPUT_PATH || '/app/media',
    outputPath: process.env.FFMPEG_OUTPUT_PATH || '/app/media/output',
    defaultBackground: process.env.DEFAULT_BACKGROUND || '/app/media/backgrounds/default.mp4',
    resolution: process.env.VIDEO_RESOLUTION || '1080x1920', // Vertical for TikTok/Reels
    fps: parseInt(process.env.VIDEO_FPS, 10) || 30,
    codec: process.env.VIDEO_CODEC || 'libx264',
    audioCodec: process.env.AUDIO_CODEC || 'aac'
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || ''
  },

  // ClawdBot Integration
  clawdbot: {
    url: process.env.CLAWDBOT_URL || 'http://zimmer-09-clawdbot:8080',
    notifyEndpoint: '/api/notify',
    alertEndpoint: '/api/alert'
  },

  // Video Platforms
  platforms: {
    youtube: {
      enabled: true,
      maxDuration: 60, // seconds for Shorts
      aspectRatio: '9:16'
    },
    tiktok: {
      enabled: true,
      maxDuration: 60,
      aspectRatio: '9:16'
    },
    instagram: {
      enabled: true,
      maxDuration: 90,
      aspectRatio: '9:16'
    }
  },

  // Media Paths
  paths: {
    audio: process.env.AUDIO_PATH || '/app/media/audio',
    video: process.env.VIDEO_PATH || '/app/media/video',
    output: process.env.OUTPUT_PATH || '/app/media/output',
    backgrounds: process.env.BACKGROUNDS_PATH || '/app/media/backgrounds'
  },

  // Rate Limiting
  rateLimit: {
    maxRequestsPerMinute: parseInt(process.env.RATE_LIMIT, 10) || 10,
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS, 10) || 3
  }
};

module.exports = config;

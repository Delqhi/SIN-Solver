/**
 * Zimmer-21: Video Generator - Main Entry Point
 * Express server for AI-powered video content generation
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');

const config = require('./config');
const logger = require('./logger');
const scriptGenerator = require('./script-generator');
const ttsEngine = require('./tts-engine');
const videoAssembler = require('./video-assembler');
const socialPoster = require('./social-poster');

// Initialize Express
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Initialize Supabase
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey || config.supabase.anonKey
);

// Active jobs tracking
const activeJobs = new Map();

// ============================================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'zimmer-21-video-generator',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeJobs: activeJobs.size
  });
});

/**
 * Detailed status endpoint
 */
app.get('/api/status', async (req, res) => {
  try {
    // Check Supabase connection
    const { error: dbError } = await supabase.from('video_queue').select('id').limit(1);
    
    // Check ClawdBot connection
    let clawdbotStatus = 'unknown';
    try {
      const axios = require('axios');
      await axios.get(`${config.clawdbot.url}/health`, { timeout: 5000 });
      clawdbotStatus = 'connected';
    } catch {
      clawdbotStatus = 'disconnected';
    }

    res.json({
      status: 'operational',
      database: dbError ? 'error' : 'connected',
      clawdbot: clawdbotStatus,
      activeJobs: activeJobs.size,
      config: {
        opencode: !!config.opencode.apiKey,
        supabase: !!config.supabase.url
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// ============================================================================
// VIDEO GENERATION ENDPOINTS
// ============================================================================

/**
 * Generate complete video from topic
 * POST /api/generate
 */
app.post('/api/generate', async (req, res) => {
  const { 
    topic, 
    contentType = 'educational',
    platform = 'tiktok',
    voice = config.tts.defaultVoice,
    backgroundPath,
    autoPost = false,
    platforms = ['tiktok']
  } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const jobId = require('uuid').v4();
  activeJobs.set(jobId, { status: 'started', startTime: Date.now() });

  // Return immediately with job ID
  res.json({ 
    jobId, 
    status: 'processing',
    message: 'Video generation started'
  });

  // Process in background
  processVideoGeneration(jobId, {
    topic,
    contentType,
    platform,
    voice,
    backgroundPath,
    autoPost,
    platforms
  }).catch(error => {
    logger.error('Background processing failed', { jobId, error: error.message });
    activeJobs.set(jobId, { status: 'failed', error: error.message });
  });
});

/**
 * Process complete video generation pipeline
 */
async function processVideoGeneration(jobId, options) {
  const { topic, contentType, platform, voice, backgroundPath, autoPost, platforms } = options;
  
  try {
    // Update job status
    activeJobs.set(jobId, { status: 'generating_script', progress: 10 });

    // Step 1: Generate script
    logger.info('Step 1: Generating script', { jobId, topic });
    const scriptResult = await scriptGenerator.generateScript(topic, contentType);
    
    if (!scriptResult.success) {
      throw new Error(`Script generation failed: ${scriptResult.error}`);
    }

    activeJobs.set(jobId, { status: 'generating_audio', progress: 30 });

    // Step 2: Convert to speech
    logger.info('Step 2: Converting to speech', { jobId });
    const ttsResult = await ttsEngine.textToSpeech(scriptResult.script, { voice });
    
    if (!ttsResult.success) {
      throw new Error(`TTS conversion failed: ${ttsResult.error}`);
    }

    activeJobs.set(jobId, { status: 'assembling_video', progress: 60 });

    // Step 3: Assemble video
    logger.info('Step 3: Assembling video', { jobId });
    const videoResult = await videoAssembler.assembleVideo({
      jobId,
      audioPath: ttsResult.audioPath,
      backgroundPath: backgroundPath || config.ffmpeg.defaultBackground,
      platform
    });

    if (!videoResult.success) {
      throw new Error(`Video assembly failed: ${videoResult.error}`);
    }

    activeJobs.set(jobId, { status: 'finalizing', progress: 80 });

    // Step 4: Save to Supabase
    logger.info('Step 4: Saving to database', { jobId });
    const { error: dbError } = await supabase
      .from('video_queue')
      .insert({
        id: jobId,
        topic,
        script: scriptResult.script,
        audio_url: ttsResult.audioPath,
        video_url: videoResult.videoPath,
        status: autoPost ? 'posting' : 'complete',
        platform: platforms,
        metadata: {
          contentType,
          voice,
          duration: videoResult.metadata.duration,
          resolution: videoResult.metadata.resolution
        }
      });

    if (dbError) {
      logger.warn('Database save failed', { jobId, error: dbError.message });
    }

    // Step 5: Auto-post if enabled
    if (autoPost) {
      activeJobs.set(jobId, { status: 'posting', progress: 90 });
      logger.info('Step 5: Auto-posting video', { jobId, platforms });
      
      const postResult = await socialPoster.postVideo({
        videoPath: videoResult.videoPath,
        platforms,
        title: topic,
        description: scriptResult.script.substring(0, 200),
        hashtags: extractHashtags(topic)
      });

      // Update database with post results
      await supabase
        .from('video_queue')
        .update({
          status: postResult.success ? 'posted' : 'post_failed',
          completed_at: new Date().toISOString(),
          post_results: postResult
        })
        .eq('id', jobId);
    }

    // Mark job complete
    activeJobs.set(jobId, { 
      status: 'complete', 
      progress: 100,
      videoPath: videoResult.videoPath,
      duration: videoResult.metadata.duration
    });

    // Notify completion
    await notifyCompletion(jobId, {
      topic,
      videoPath: videoResult.videoPath,
      duration: videoResult.metadata.duration,
      autoPosted: autoPost
    });

    logger.info('Video generation complete', { jobId });

  } catch (error) {
    logger.error('Video generation pipeline failed', { jobId, error: error.message });
    
    activeJobs.set(jobId, { 
      status: 'failed', 
      error: error.message 
    });

    // Update database
    await supabase
      .from('video_queue')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', jobId);

    // Notify failure
    await notifyFailure(jobId, error.message);
  }
}

/**
 * Extract hashtags from topic
 */
function extractHashtags(topic) {
  const words = topic.toLowerCase().split(/\s+/);
  const hashtags = words
    .filter(w => w.length > 3)
    .slice(0, 5)
    .map(w => w.replace(/[^a-zäöüß]/g, ''));
  return ['video', 'shorts', ...hashtags];
}

/**
 * Notify completion via ClawdBot
 */
async function notifyCompletion(jobId, details) {
  try {
    const axios = require('axios');
    await axios.post(`${config.clawdbot.url}${config.clawdbot.notifyEndpoint}`, {
      type: 'success',
      message: `✅ Video erstellt: ${details.topic}`,
      details: {
        jobId,
        duration: `${details.duration}s`,
        autoPosted: details.autoPosted
      },
      source: 'zimmer-21-video-generator'
    }, { timeout: 10000 });
  } catch (error) {
    logger.warn('Completion notification failed', { error: error.message });
  }
}

/**
 * Notify failure via ClawdBot
 */
async function notifyFailure(jobId, errorMessage) {
  try {
    const axios = require('axios');
    await axios.post(`${config.clawdbot.url}${config.clawdbot.alertEndpoint}`, {
      type: 'error',
      message: `❌ Video-Generierung fehlgeschlagen`,
      details: { jobId, error: errorMessage },
      source: 'zimmer-21-video-generator'
    }, { timeout: 10000 });
  } catch (error) {
    logger.warn('Failure notification failed', { error: error.message });
  }
}

/**
 * Get job status
 * GET /api/jobs/:jobId
 */
app.get('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({ jobId, ...job });
});

/**
 * List all active jobs
 * GET /api/jobs
 */
app.get('/api/jobs', (req, res) => {
  const jobs = [];
  activeJobs.forEach((value, key) => {
    jobs.push({ jobId: key, ...value });
  });
  res.json({ jobs, count: jobs.length });
});

// ============================================================================
// INDIVIDUAL PIPELINE ENDPOINTS
// ============================================================================

/**
 * Generate script only
 * POST /api/script
 */
app.post('/api/script', async (req, res) => {
  const { topic, contentType = 'educational' } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const result = await scriptGenerator.generateScript(topic, contentType);
    res.json(result);
  } catch (error) {
    logger.error('Script endpoint failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Convert text to speech only
 * POST /api/tts
 */
app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const result = await ttsEngine.textToSpeech(text, { voice });
    res.json(result);
  } catch (error) {
    logger.error('TTS endpoint failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Assemble video from audio
 * POST /api/assemble
 */
app.post('/api/assemble', async (req, res) => {
  const { audioPath, backgroundPath, platform = 'tiktok' } = req.body;

  if (!audioPath) {
    return res.status(400).json({ error: 'Audio path is required' });
  }

  try {
    const result = await videoAssembler.assembleVideo({
      audioPath,
      backgroundPath,
      platform
    });
    res.json(result);
  } catch (error) {
    logger.error('Assemble endpoint failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Post video to social media
 * POST /api/post
 */
app.post('/api/post', async (req, res) => {
  const { videoPath, platforms, title, description, hashtags } = req.body;

  if (!videoPath) {
    return res.status(400).json({ error: 'Video path is required' });
  }

  try {
    const result = await socialPoster.postVideo({
      videoPath,
      platforms,
      title,
      description,
      hashtags
    });
    res.json(result);
  } catch (error) {
    logger.error('Post endpoint failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * List available TTS voices
 * GET /api/voices
 */
app.get('/api/voices', async (req, res) => {
  try {
    const voices = await ttsEngine.listVoices();
    res.json({ voices, default: config.tts.defaultVoice });
  } catch (error) {
    res.json({ 
      voices: Object.keys(ttsEngine.VOICE_CONFIGS),
      default: config.tts.defaultVoice
    });
  }
});

// ============================================================================
// QUEUE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get pending videos from queue
 * GET /api/queue
 */
app.get('/api/queue', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('video_queue')
      .select('*')
      .in('status', ['pending', 'generating', 'posting'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ queue: data || [], count: data?.length || 0 });
  } catch (error) {
    logger.error('Queue fetch failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add topic to queue
 * POST /api/queue
 */
app.post('/api/queue', async (req, res) => {
  const { topic, contentType, platforms, scheduledTime } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const { data, error } = await supabase
      .from('video_queue')
      .insert({
        topic,
        content_type: contentType || 'educational',
        platform: platforms || ['tiktok'],
        status: 'pending',
        scheduled_at: scheduledTime
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, video: data });
  } catch (error) {
    logger.error('Queue insert failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

const server = app.listen(config.server.port, config.server.host, () => {
  logger.info(`Zimmer-21 Video Generator started`, {
    port: config.server.port,
    env: config.server.env
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;

/**
 * Zimmer-21: Video Assembler
 * FFmpeg-based video assembly from audio and visual assets
 */

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const logger = require('./logger');

/**
 * Video presets for different platforms
 */
const VIDEO_PRESETS = {
  tiktok: {
    width: 1080,
    height: 1920,
    fps: 30,
    videoBitrate: '4000k',
    audioBitrate: '128k',
    format: 'mp4',
    codec: 'libx264',
    preset: 'fast',
    maxDuration: 60
  },
  youtube_shorts: {
    width: 1080,
    height: 1920,
    fps: 30,
    videoBitrate: '8000k',
    audioBitrate: '192k',
    format: 'mp4',
    codec: 'libx264',
    preset: 'medium',
    maxDuration: 60
  },
  instagram_reels: {
    width: 1080,
    height: 1920,
    fps: 30,
    videoBitrate: '5000k',
    audioBitrate: '128k',
    format: 'mp4',
    codec: 'libx264',
    preset: 'fast',
    maxDuration: 90
  },
  square: {
    width: 1080,
    height: 1080,
    fps: 30,
    videoBitrate: '4000k',
    audioBitrate: '128k',
    format: 'mp4',
    codec: 'libx264',
    preset: 'fast',
    maxDuration: 60
  }
};

/**
 * Assemble video from audio and background
 * @param {object} options - Assembly options
 * @returns {Promise<object>} Result with video file path
 */
async function assembleVideo(options = {}) {
  const startTime = Date.now();
  const jobId = options.jobId || uuidv4();
  
  const {
    audioPath,
    backgroundPath,
    outputPath = config.paths.output,
    platform = 'tiktok',
    overlayText,
    subtitles
  } = options;

  const preset = VIDEO_PRESETS[platform] || VIDEO_PRESETS.tiktok;
  const outputFile = path.join(outputPath, `${jobId}.mp4`);

  try {
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });

    // Verify input files exist
    await fs.access(audioPath);
    
    // Get audio duration
    const audioDuration = await getMediaDuration(audioPath);
    
    logger.info('Starting video assembly', {
      jobId,
      platform,
      audioDuration,
      hasBackground: !!backgroundPath
    });

    // Determine background type
    const backgroundType = await determineBackgroundType(backgroundPath);
    
    // Build and run FFmpeg command
    await new Promise((resolve, reject) => {
      let command = ffmpeg();
      
      // Handle different background types
      if (backgroundType === 'video') {
        // Loop video to match audio duration
        command
          .input(backgroundPath)
          .inputOptions(['-stream_loop', '-1']) // Loop indefinitely
          .input(audioPath);
      } else if (backgroundType === 'image') {
        // Create video from static image
        command
          .input(backgroundPath)
          .inputOptions(['-loop', '1'])
          .input(audioPath);
      } else {
        // Generate solid color background
        command
          .input(`color=c=black:s=${preset.width}x${preset.height}:d=${audioDuration}`)
          .inputOptions(['-f', 'lavfi'])
          .input(audioPath);
      }

      // Build filter complex for text overlays
      let filterComplex = [];
      
      // Scale video to target resolution
      filterComplex.push(`[0:v]scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2[scaled]`);

      // Add text overlay if provided
      if (overlayText) {
        const textFilter = buildTextFilter(overlayText, preset);
        filterComplex.push(`[scaled]${textFilter}[withtext]`);
      }

      const finalVideo = overlayText ? '[withtext]' : '[scaled]';

      command
        .complexFilter(filterComplex.join(';'))
        .outputOptions([
          '-map', finalVideo,
          '-map', '1:a',
          '-c:v', preset.codec,
          '-preset', preset.preset,
          '-b:v', preset.videoBitrate,
          '-c:a', 'aac',
          '-b:a', preset.audioBitrate,
          '-r', preset.fps.toString(),
          '-t', Math.min(audioDuration, preset.maxDuration).toString(),
          '-movflags', '+faststart',
          '-pix_fmt', 'yuv420p'
        ])
        .output(outputFile)
        .on('start', (cmd) => {
          logger.debug('FFmpeg command', { command: cmd });
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.debug('Encoding progress', { percent: Math.round(progress.percent) });
          }
        })
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Get output file stats
    const stats = await fs.stat(outputFile);
    const videoDuration = await getMediaDuration(outputFile);

    const result = {
      success: true,
      jobId,
      videoPath: outputFile,
      metadata: {
        platform,
        duration: videoDuration,
        fileSize: stats.size,
        resolution: `${preset.width}x${preset.height}`,
        fps: preset.fps,
        assemblyTimeMs: Date.now() - startTime
      }
    };

    logger.info('Video assembly completed', result.metadata);
    return result;

  } catch (error) {
    logger.error('Video assembly failed', {
      jobId,
      error: error.message
    });

    // Clean up failed output
    await fs.unlink(outputFile).catch(() => {});

    return {
      success: false,
      jobId,
      error: error.message,
      videoPath: null,
      metadata: {
        platform,
        assemblyTimeMs: Date.now() - startTime
      }
    };
  }
}

/**
 * Determine the type of background media
 * @param {string} backgroundPath - Path to background file
 * @returns {Promise<string>} 'video', 'image', or 'none'
 */
async function determineBackgroundType(backgroundPath) {
  if (!backgroundPath) return 'none';
  
  try {
    await fs.access(backgroundPath);
    const ext = path.extname(backgroundPath).toLowerCase();
    
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    if (videoExtensions.includes(ext)) return 'video';
    if (imageExtensions.includes(ext)) return 'image';
    
    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Build FFmpeg text filter for overlay
 * @param {object} textConfig - Text configuration
 * @param {object} preset - Video preset
 * @returns {string} FFmpeg filter string
 */
function buildTextFilter(textConfig, preset) {
  const {
    text,
    fontSize = 48,
    fontColor = 'white',
    fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    position = 'center',
    shadowColor = 'black',
    shadowX = 2,
    shadowY = 2
  } = textConfig;

  // Calculate position
  let x, y;
  switch (position) {
    case 'top':
      x = '(w-text_w)/2';
      y = 'h*0.1';
      break;
    case 'bottom':
      x = '(w-text_w)/2';
      y = 'h*0.85';
      break;
    case 'center':
    default:
      x = '(w-text_w)/2';
      y = '(h-text_h)/2';
  }

  // Escape special characters in text
  const escapedText = text
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\\/g, '\\\\');

  return `drawtext=text='${escapedText}':fontfile=${fontFile}:fontsize=${fontSize}:fontcolor=${fontColor}:x=${x}:y=${y}:shadowcolor=${shadowColor}:shadowx=${shadowX}:shadowy=${shadowY}`;
}

/**
 * Get media duration using ffprobe
 * @param {string} mediaPath - Path to media file
 * @returns {Promise<number>} Duration in seconds
 */
function getMediaDuration(mediaPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(mediaPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Generate thumbnail from video
 * @param {string} videoPath - Path to video file
 * @param {object} options - Thumbnail options
 * @returns {Promise<object>} Result with thumbnail path
 */
async function generateThumbnail(videoPath, options = {}) {
  const {
    timestamp = '00:00:01',
    outputPath = config.paths.output,
    width = 1080,
    height = 1920
  } = options;

  const jobId = uuidv4();
  const thumbnailFile = path.join(outputPath, `thumb_${jobId}.jpg`);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: `thumb_${jobId}.jpg`,
          folder: outputPath,
          size: `${width}x${height}`
        })
        .on('end', resolve)
        .on('error', reject);
    });

    return {
      success: true,
      thumbnailPath: thumbnailFile
    };
  } catch (error) {
    logger.error('Thumbnail generation failed', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add subtitles to video
 * @param {string} videoPath - Input video path
 * @param {string} subtitlePath - SRT subtitle file path
 * @param {object} options - Subtitle styling options
 * @returns {Promise<object>} Result with output video path
 */
async function addSubtitles(videoPath, subtitlePath, options = {}) {
  const jobId = uuidv4();
  const outputFile = path.join(config.paths.output, `sub_${jobId}.mp4`);

  const {
    fontSize = 24,
    fontColor = '&HFFFFFF',
    outlineColor = '&H000000',
    outlineWidth = 2
  } = options;

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          `-vf subtitles=${subtitlePath}:force_style='FontSize=${fontSize},PrimaryColour=${fontColor},OutlineColour=${outlineColor},Outline=${outlineWidth}'`
        ])
        .output(outputFile)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    return {
      success: true,
      videoPath: outputFile
    };
  } catch (error) {
    logger.error('Subtitle addition failed', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  assembleVideo,
  generateThumbnail,
  addSubtitles,
  getMediaDuration,
  VIDEO_PRESETS
};

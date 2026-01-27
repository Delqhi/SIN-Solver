/**
 * Zimmer-21: Social Poster
 * Integration with ClawdBot for multi-platform social media posting
 */

const axios = require('axios');
const fs = require('fs').promises;
const FormData = require('form-data');
const config = require('./config');
const logger = require('./logger');

/**
 * Platform-specific posting configurations
 */
const PLATFORM_CONFIGS = {
  tiktok: {
    maxTitleLength: 150,
    hashtagLimit: 5,
    supportedFormats: ['mp4'],
    aspectRatio: '9:16'
  },
  youtube: {
    maxTitleLength: 100,
    maxDescriptionLength: 5000,
    hashtagLimit: 15,
    supportedFormats: ['mp4', 'mov'],
    aspectRatio: '9:16'
  },
  instagram: {
    maxCaptionLength: 2200,
    hashtagLimit: 30,
    supportedFormats: ['mp4'],
    aspectRatio: '9:16'
  },
  twitter: {
    maxTextLength: 280,
    supportedFormats: ['mp4'],
    maxDuration: 140
  }
};

/**
 * Post video to social media via ClawdBot
 * @param {object} options - Posting options
 * @returns {Promise<object>} Result with post URLs
 */
async function postVideo(options = {}) {
  const {
    videoPath,
    platforms = ['tiktok', 'youtube', 'instagram'],
    title,
    description,
    hashtags = [],
    scheduledTime = null
  } = options;

  const results = {
    success: true,
    posts: [],
    errors: []
  };

  // Verify video file exists
  try {
    await fs.access(videoPath);
  } catch (error) {
    logger.error('Video file not found', { videoPath });
    return {
      success: false,
      error: 'Video file not found',
      posts: [],
      errors: [{ platform: 'all', error: 'Video file not found' }]
    };
  }

  // Post to each platform
  for (const platform of platforms) {
    try {
      const platformConfig = PLATFORM_CONFIGS[platform];
      if (!platformConfig) {
        results.errors.push({ platform, error: 'Unsupported platform' });
        continue;
      }

      // Prepare platform-specific content
      const content = preparePlatformContent(platform, {
        title,
        description,
        hashtags
      });

      // Send to ClawdBot
      const postResult = await sendToClawdBot({
        platform,
        videoPath,
        content,
        scheduledTime
      });

      if (postResult.success) {
        results.posts.push({
          platform,
          postId: postResult.postId,
          url: postResult.url,
          scheduledTime: scheduledTime
        });
      } else {
        results.errors.push({
          platform,
          error: postResult.error
        });
      }

    } catch (error) {
      logger.error('Platform posting failed', { platform, error: error.message });
      results.errors.push({
        platform,
        error: error.message
      });
    }
  }

  results.success = results.errors.length === 0;
  
  // Notify about posting results
  await notifyPostingResult(results);

  return results;
}

/**
 * Prepare content for specific platform
 * @param {string} platform - Target platform
 * @param {object} content - Raw content
 * @returns {object} Platform-optimized content
 */
function preparePlatformContent(platform, content) {
  const config = PLATFORM_CONFIGS[platform];
  const { title, description, hashtags } = content;

  // Limit hashtags per platform
  const limitedHashtags = hashtags.slice(0, config.hashtagLimit);
  const hashtagString = limitedHashtags.map(tag => 
    tag.startsWith('#') ? tag : `#${tag}`
  ).join(' ');

  switch (platform) {
    case 'tiktok':
      return {
        caption: `${title}\n\n${hashtagString}`.slice(0, config.maxTitleLength)
      };

    case 'youtube':
      return {
        title: title.slice(0, config.maxTitleLength),
        description: `${description}\n\n${hashtagString}`.slice(0, config.maxDescriptionLength),
        tags: limitedHashtags.map(tag => tag.replace('#', ''))
      };

    case 'instagram':
      return {
        caption: `${title}\n\n${description}\n\n${hashtagString}`.slice(0, config.maxCaptionLength)
      };

    case 'twitter':
      // Twitter needs shortest content
      const tweetText = `${title} ${hashtagString}`;
      return {
        text: tweetText.slice(0, config.maxTextLength)
      };

    default:
      return { title, description, hashtags: limitedHashtags };
  }
}

/**
 * Send video to ClawdBot for posting
 * @param {object} options - Request options
 * @returns {Promise<object>} ClawdBot response
 */
async function sendToClawdBot(options) {
  const { platform, videoPath, content, scheduledTime } = options;

  try {
    const payload = {
      action: 'post_video',
      platform,
      content,
      videoPath,
      scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : null
    };

    const response = await axios.post(
      `${config.clawdbot.url}/api/social/post`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 minute timeout for video upload
      }
    );

    logger.info('ClawdBot post successful', {
      platform,
      postId: response.data.postId
    });

    return {
      success: true,
      postId: response.data.postId,
      url: response.data.url
    };

  } catch (error) {
    logger.error('ClawdBot request failed', {
      platform,
      error: error.message,
      status: error.response?.status
    });

    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

/**
 * Notify about posting results via ClawdBot
 * @param {object} results - Posting results
 */
async function notifyPostingResult(results) {
  const successCount = results.posts.length;
  const errorCount = results.errors.length;

  const messageType = results.success ? 'success' : errorCount > 0 ? 'warning' : 'error';
  
  const message = results.success
    ? `✅ Video erfolgreich auf ${successCount} Plattform(en) gepostet`
    : `⚠️ Video-Posting: ${successCount} erfolgreich, ${errorCount} fehlgeschlagen`;

  const details = {
    posts: results.posts.map(p => `${p.platform}: ${p.url || 'scheduled'}`),
    errors: results.errors.map(e => `${e.platform}: ${e.error}`)
  };

  try {
    await axios.post(
      `${config.clawdbot.url}${config.clawdbot.notifyEndpoint}`,
      {
        type: messageType,
        message,
        details,
        source: 'zimmer-21-video-generator'
      },
      { timeout: 10000 }
    );
  } catch (error) {
    logger.warn('Failed to send notification', { error: error.message });
  }
}

/**
 * Schedule multiple videos for posting
 * @param {Array<object>} videos - Array of video posting configs
 * @returns {Promise<object>} Batch results
 */
async function scheduleVideos(videos) {
  const results = [];

  for (const video of videos) {
    const result = await postVideo(video);
    results.push({
      videoId: video.id || video.videoPath,
      ...result
    });
  }

  return {
    total: videos.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
}

/**
 * Get posting analytics from ClawdBot
 * @param {string} platform - Platform to check
 * @param {number} days - Number of days to look back
 * @returns {Promise<object>} Analytics data
 */
async function getAnalytics(platform, days = 7) {
  try {
    const response = await axios.get(
      `${config.clawdbot.url}/api/analytics`,
      {
        params: { platform, days },
        timeout: 10000
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    logger.error('Failed to get analytics', { platform, error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  postVideo,
  scheduleVideos,
  getAnalytics,
  notifyPostingResult,
  PLATFORM_CONFIGS
};

/**
 * SIN-Solver Clawdbot - Social Media API Routes
 * Express router for social media operations
 * 
 * @version 1.0.0
 * @author SIN-Solver Empire
 */

const express = require('express');
const { SocialMediaManager } = require('./manager');
const { TwitterPlatform, InstagramPlatform, TikTokPlatform, YouTubePlatform } = require('./platforms');

const router = express.Router();

// Initialize social media manager
const socialManager = SocialMediaManager.getInstance();

// Register platforms on startup
function initializeSocialPlatforms() {
  // Twitter/X
  if (process.env.TWITTER_USERNAME && process.env.TWITTER_PASSWORD) {
    socialManager.register('twitter', new TwitterPlatform());
  }

  // Instagram
  if (process.env.INSTAGRAM_USERNAME && process.env.INSTAGRAM_PASSWORD) {
    socialManager.register('instagram', new InstagramPlatform());
  }

  // TikTok
  if (process.env.TIKTOK_USERNAME && process.env.TIKTOK_PASSWORD) {
    socialManager.register('tiktok', new TikTokPlatform());
  }

  // YouTube (OAuth-based)
  if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_REFRESH_TOKEN) {
    socialManager.register('youtube', new YouTubePlatform());
  }

  // Initialize all
  socialManager.initializeAll().then(results => {
    console.log('Social platforms initialized:', results);
  }).catch(err => {
    console.error('Social platform init error:', err);
  });

  // Start scheduled post processor
  setInterval(() => {
    socialManager.processScheduledPosts();
  }, 60000); // Check every minute
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/social/status
 * Get status of all social platforms
 */
router.get('/api/social/status', (req, res) => {
  res.json(socialManager.getStatus());
});

/**
 * GET /api/social/platforms
 * List available platforms
 */
router.get('/api/social/platforms', (req, res) => {
  const status = socialManager.getStatus();
  const platforms = Object.entries(status.platforms).map(([name, info]) => ({
    name,
    ...info
  }));
  res.json({ platforms });
});

/**
 * POST /api/social/post
 * Post content to social media
 * Body: { action: 'post_video' | 'post_text', platform: string | string[], ... }
 */
router.post('/api/social/post', async (req, res) => {
  const { action, platform, platforms: platformsList, ...content } = req.body;

  const targetPlatforms = platformsList || (platform ? [platform] : ['all']);

  try {
    let result;

    switch (action) {
      case 'post_video':
        result = await socialManager.postVideo({
          videoPath: content.videoPath,
          platforms: targetPlatforms,
          title: content.content?.title || content.title,
          description: content.content?.description || content.description,
          hashtags: content.content?.hashtags || content.hashtags,
          scheduledTime: content.scheduledTime
        });
        break;

      case 'post_text':
        result = await socialManager.postText({
          text: content.text,
          imagePath: content.imagePath,
          platforms: targetPlatforms,
          hashtags: content.hashtags
        });
        break;

      default:
        // Default to video if videoPath present, else text
        if (content.videoPath) {
          result = await socialManager.postVideo({
            videoPath: content.videoPath,
            platforms: targetPlatforms,
            title: content.title,
            description: content.description,
            hashtags: content.hashtags,
            scheduledTime: content.scheduledTime
          });
        } else {
          result = await socialManager.postText({
            text: content.text || content.message,
            imagePath: content.imagePath,
            platforms: targetPlatforms,
            hashtags: content.hashtags
          });
        }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/video
 * Post video to platforms
 */
router.post('/api/social/video', async (req, res) => {
  const { videoPath, platforms, title, description, hashtags, scheduledTime } = req.body;

  if (!videoPath) {
    return res.status(400).json({ error: 'videoPath is required' });
  }

  try {
    const result = await socialManager.postVideo({
      videoPath,
      platforms: platforms || ['all'],
      title,
      description,
      hashtags,
      scheduledTime
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/social/text
 * Post text/image to platforms
 */
router.post('/api/social/text', async (req, res) => {
  const { text, imagePath, platforms, hashtags } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const result = await socialManager.postText({
      text,
      imagePath,
      platforms: platforms || ['all'],
      hashtags
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/social/history
 * Get post history
 */
router.get('/api/social/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const platform = req.query.platform || null;

  res.json({
    posts: socialManager.getHistory(limit, platform)
  });
});

/**
 * GET /api/social/scheduled
 * Get scheduled posts
 */
router.get('/api/social/scheduled', (req, res) => {
  res.json({
    posts: socialManager.getScheduledPosts()
  });
});

/**
 * DELETE /api/social/scheduled/:id
 * Cancel a scheduled post
 */
router.delete('/api/social/scheduled/:id', (req, res) => {
  const { id } = req.params;
  const cancelled = socialManager.cancelScheduledPost(id);

  if (cancelled) {
    res.json({ success: true, message: 'Post cancelled' });
  } else {
    res.status(404).json({ error: 'Scheduled post not found' });
  }
});

/**
 * POST /api/social/test/:platform
 * Send test post to specific platform
 */
router.post('/api/social/test/:platform', async (req, res) => {
  const { platform } = req.params;
  const platformInstance = socialManager.get(platform);

  if (!platformInstance) {
    return res.status(404).json({ error: `Platform ${platform} not found` });
  }

  try {
    // Send test text post
    const result = await platformInstance.post({
      type: 'text',
      text: `🧪 Test post from SIN-Solver ClawdBot\n⏰ ${new Date().toLocaleString('de-DE')}`
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  router,
  initializeSocialPlatforms,
  socialManager
};

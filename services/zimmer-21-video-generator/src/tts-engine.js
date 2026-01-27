/**
 * Zimmer-21: TTS Engine
 * Text-to-Speech using edge-tts (FREE Microsoft TTS)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const logger = require('./logger');

const execAsync = promisify(exec);

/**
 * Voice configurations with language and style
 */
const VOICE_CONFIGS = {
  // German Voices
  'de-DE-KatjaNeural': { language: 'de', gender: 'female', style: 'professional' },
  'de-DE-ConradNeural': { language: 'de', gender: 'male', style: 'professional' },
  'de-DE-AmalaNeural': { language: 'de', gender: 'female', style: 'friendly' },
  'de-DE-KillianNeural': { language: 'de', gender: 'male', style: 'casual' },
  
  // English Voices
  'en-US-JennyNeural': { language: 'en', gender: 'female', style: 'professional' },
  'en-US-GuyNeural': { language: 'en', gender: 'male', style: 'casual' },
  'en-US-AriaNeural': { language: 'en', gender: 'female', style: 'cheerful' },
  'en-US-DavisNeural': { language: 'en', gender: 'male', style: 'deep' }
};

/**
 * Convert text to speech using edge-tts CLI
 * @param {string} text - Text to convert
 * @param {object} options - TTS options
 * @returns {Promise<object>} Result with audio file path
 */
async function textToSpeech(text, options = {}) {
  const startTime = Date.now();
  const jobId = uuidv4();
  
  const voice = options.voice || config.tts.defaultVoice;
  const rate = options.rate || config.tts.rate;
  const volume = options.volume || config.tts.volume;
  const outputPath = options.outputPath || config.paths.audio;
  
  const outputFile = path.join(outputPath, `${jobId}.mp3`);
  const textFile = path.join(outputPath, `${jobId}.txt`);

  try {
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Write text to temporary file (handles special characters better)
    await fs.writeFile(textFile, text, 'utf8');
    
    logger.info('Starting TTS conversion', { jobId, voice, textLength: text.length });

    // Build edge-tts command
    // Using Python edge-tts CLI which is more reliable than Node package
    const command = buildEdgeTtsCommand({
      textFile,
      outputFile,
      voice,
      rate,
      volume
    });

    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000, // 2 minute timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    // Verify output file exists
    const stats = await fs.stat(outputFile);
    
    // Get audio duration using ffprobe
    const duration = await getAudioDuration(outputFile);

    // Clean up text file
    await fs.unlink(textFile).catch(() => {});

    const result = {
      success: true,
      jobId,
      audioPath: outputFile,
      metadata: {
        voice,
        rate,
        volume,
        textLength: text.length,
        fileSize: stats.size,
        durationSeconds: duration,
        generationTimeMs: Date.now() - startTime
      }
    };

    logger.info('TTS conversion completed', result.metadata);
    return result;

  } catch (error) {
    logger.error('TTS conversion failed', {
      jobId,
      voice,
      error: error.message
    });

    // Clean up temporary files
    await fs.unlink(textFile).catch(() => {});
    await fs.unlink(outputFile).catch(() => {});

    // Try alternative voice if primary fails
    if (!options._isRetry) {
      const altVoice = getAlternativeVoice(voice);
      if (altVoice) {
        logger.info('Retrying with alternative voice', { altVoice });
        return textToSpeech(text, { ...options, voice: altVoice, _isRetry: true });
      }
    }

    return {
      success: false,
      jobId,
      error: error.message,
      audioPath: null,
      metadata: {
        voice,
        generationTimeMs: Date.now() - startTime
      }
    };
  }
}

/**
 * Build edge-tts command
 * @param {object} params - Command parameters
 * @returns {string} Shell command
 */
function buildEdgeTtsCommand({ textFile, outputFile, voice, rate, volume }) {
  // Escape single quotes in file paths
  const escapedTextFile = textFile.replace(/'/g, "'\\''");
  const escapedOutputFile = outputFile.replace(/'/g, "'\\''");
  
  let command = `edge-tts --voice "${voice}" --file "${escapedTextFile}" --write-media "${escapedOutputFile}"`;
  
  // Add rate if not default
  if (rate && rate !== '+0%') {
    command += ` --rate="${rate}"`;
  }
  
  // Add volume if not default
  if (volume && volume !== '+0%') {
    command += ` --volume="${volume}"`;
  }
  
  return command;
}

/**
 * Get audio duration using ffprobe
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
async function getAudioDuration(audioPath) {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    return parseFloat(stdout.trim()) || 0;
  } catch (error) {
    logger.warn('Could not get audio duration', { audioPath, error: error.message });
    return 0;
  }
}

/**
 * Get alternative voice for fallback
 * @param {string} currentVoice - Current voice that failed
 * @returns {string|null} Alternative voice or null
 */
function getAlternativeVoice(currentVoice) {
  const voiceConfig = VOICE_CONFIGS[currentVoice];
  if (!voiceConfig) return config.tts.defaultVoice;
  
  // Find alternative with same language and gender
  for (const [voice, cfg] of Object.entries(VOICE_CONFIGS)) {
    if (voice !== currentVoice && 
        cfg.language === voiceConfig.language && 
        cfg.gender === voiceConfig.gender) {
      return voice;
    }
  }
  
  // Find alternative with same language only
  for (const [voice, cfg] of Object.entries(VOICE_CONFIGS)) {
    if (voice !== currentVoice && cfg.language === voiceConfig.language) {
      return voice;
    }
  }
  
  return null;
}

/**
 * List available voices
 * @returns {Promise<string[]>} List of available voices
 */
async function listVoices() {
  try {
    const { stdout } = await execAsync('edge-tts --list-voices');
    const voices = stdout
      .split('\n')
      .filter(line => line.includes('Name:'))
      .map(line => line.replace('Name:', '').trim());
    return voices;
  } catch (error) {
    logger.error('Failed to list voices', { error: error.message });
    return Object.keys(VOICE_CONFIGS);
  }
}

/**
 * Batch convert multiple texts to speech
 * @param {Array<{id: string, text: string}>} items - Items to convert
 * @param {object} options - TTS options
 * @returns {Promise<object[]>} Results array
 */
async function batchTextToSpeech(items, options = {}) {
  const results = [];
  
  for (const item of items) {
    const result = await textToSpeech(item.text, {
      ...options,
      _itemId: item.id
    });
    results.push({
      itemId: item.id,
      ...result
    });
    
    // Small delay between conversions to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

module.exports = {
  textToSpeech,
  listVoices,
  batchTextToSpeech,
  getAudioDuration,
  VOICE_CONFIGS
};

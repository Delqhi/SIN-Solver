/**
 * Human Behavior Module
 * Simulates realistic human interaction patterns
 * 
 * Features:
 * - Variable typing speeds (40-120 WPM)
 * - Random mouse movement curves
 * - Micro-pauses during typing
 * - Jittery delays
 * - Natural click patterns
 */

class HumanBehavior {
  /**
   * Generate human-like typing speed (WPM = words per minute)
   * Average human: 40-60 WPM
   * Fast typist: 80-120 WPM
   */
  static getTypingSpeed(minWpm = 40, maxWpm = 120) {
    const wpm = Math.random() * (maxWpm - minWpm) + minWpm;
    const avgCharPerWord = 5;
    const msPerChar = (60000 / wpm) / avgCharPerWord;
    return msPerChar;
  }

  /**
   * Generate typing with micro-pauses (like thinking)
   */
  static generateTypingSequence(text, msPerChar) {
    const sequence = [];
    let delay = 0;

    for (let i = 0; i < text.length; i++) {
      const charDelay = msPerChar + (Math.random() * msPerChar * 0.3);
      delay += charDelay;

      // Add micro-pause every 3-7 characters (like thinking)
      if (Math.random() < 0.15) {
        delay += Math.random() * 200 + 50;
      }

      sequence.push({
        char: text[i],
        delay: Math.round(delay),
        totalTime: Math.round(delay)
      });
    }

    return sequence;
  }

  /**
   * Generate curved mouse movement (more natural than linear)
   * Bezier curve interpolation
   */
  static generateMousePath(startX, startY, endX, endY, duration = 500) {
    const steps = Math.floor(duration / 10); // 10ms per step
    const path = [];

    // Control points for Bezier curve (adds natural curve)
    const controlX = startX + (endX - startX) * (0.3 + Math.random() * 0.4);
    const controlY = startY + (endY - startY) * (0.3 + Math.random() * 0.4);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const t1 = 1 - t;

      // Quadratic Bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      const x = t1 * t1 * startX + 2 * t1 * t * controlX + t * t * endX;
      const y = t1 * t1 * startY + 2 * t1 * t * controlY + t * t * endY;

      path.push({
        x: Math.round(x),
        y: Math.round(y),
        time: Math.round(i * 10),
        progress: t
      });
    }

    return path;
  }

  /**
   * Generate variable delay with jitter
   * minMs to maxMs with random variation
   */
  static getRandomDelay(minMs = 300, maxMs = 800) {
    const base = Math.random() * (maxMs - minMs) + minMs;
    const jitter = (Math.random() - 0.5) * 100; // ±50ms
    return Math.max(minMs, Math.round(base + jitter));
  }

  /**
   * Simulate mouse acceleration (starts slow, speeds up, slows down)
   */
  static generateAcceleratingMovement(startX, startY, endX, endY, duration = 500) {
    const steps = Math.floor(duration / 10);
    const path = [];

    for (let i = 0; i <= steps; i++) {
      // Ease-in-out cubic: starts slow, accelerates, then decelerates
      const t = i / steps;
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const x = startX + (endX - startX) * eased;
      const y = startY + (endY - startY) * eased;

      path.push({
        x: Math.round(x),
        y: Math.round(y),
        time: Math.round(i * 10)
      });
    }

    return path;
  }

  /**
   * Simulate realistic break pattern
   * Longer breaks every N attempts
   */
  static getBreakSchedule(currentAttempt, breakEveryN = 20, minMs = 5000, maxMs = 15000) {
    if (currentAttempt % breakEveryN === 0 && currentAttempt > 0) {
      return {
        shouldBreak: true,
        duration: Math.random() * (maxMs - minMs) + minMs,
        reason: `Break after ${breakEveryN} attempts (attempt #${currentAttempt})`
      };
    }

    return { shouldBreak: false };
  }

  /**
   * Simulate eye movement (gaze tracking prevention)
   */
  static generateGazePattern(elementX, elementY, duration = 2000) {
    const fixations = [];
    let totalTime = 0;

    // 3-4 fixations (eye stops)
    const numFixations = Math.floor(Math.random() * 2) + 3;

    for (let i = 0; i < numFixations; i++) {
      const fixationDuration = Math.random() * 400 + 200; // 200-600ms per fixation
      const offsetX = (Math.random() - 0.5) * 100; // ±50px variation
      const offsetY = (Math.random() - 0.5) * 100;

      fixations.push({
        x: elementX + offsetX,
        y: elementY + offsetY,
        startTime: totalTime,
        duration: fixationDuration,
        endTime: totalTime + fixationDuration
      });

      totalTime += fixationDuration + (Math.random() * 200 + 100); // Saccade time
    }

    return fixations;
  }

  /**
   * Simulate realistic click pattern
   * Small pause before, then click, then slight pause
   */
  static getClickTiming(minPreClickMs = 100, maxPreClickMs = 400) {
    return {
      preClickDelay: Math.random() * (maxPreClickMs - minPreClickMs) + minPreClickMs,
      clickDuration: 50, // How long button is "held"
      postClickDelay: Math.random() * 300 + 50
    };
  }

  /**
   * Detect suspicious patterns that indicate botting
   */
  static isSuspiciousPattern(stats) {
    const {
      typingSpeed = 0, // ms per char
      clickFrequency = 0, // clicks per second
      breakPattern = null,
      gazeMovement = null
    } = stats;

    const issues = [];

    // Too fast typing (impossible for human)
    if (typingSpeed < 15) {
      issues.push('Typing too fast (<15ms per char)');
    }

    // Too slow typing (indicates thinking/delay)
    if (typingSpeed > 400) {
      issues.push('Typing too slow (>400ms per char)');
    }

    // Clicking too fast
    if (clickFrequency > 5) {
      issues.push('Clicking too fast (>5 clicks/sec)');
    }

    // No breaks (inhuman endurance)
    if (breakPattern === 'never') {
      issues.push('No breaks detected (inhuman)');
    }

    // Perfect linear movement (unnatural)
    if (gazeMovement === 'linear') {
      issues.push('Mouse movement too linear (unnatural)');
    }

    return {
      isSuspicious: issues.length > 0,
      issues
    };
  }
}

module.exports = HumanBehavior;

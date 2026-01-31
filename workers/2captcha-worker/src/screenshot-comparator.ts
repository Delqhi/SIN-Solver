/**
 * Screenshot Comparator - Image comparison tool for detecting UI changes
 * 
 * Uses pixelmatch for pixel-level comparison and pngjs for image I/O.
 * Useful for detecting when 2Captcha changes their UI or for identifying
 * specific error states.
 * 
 * @module screenshot-comparator
 */

import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Result of a screenshot comparison
 */
export interface ComparisonResult {
  /** Whether the images match within the threshold */
  match: boolean;
  /** Number of pixels that differ between the images */
  mismatchedPixels: number;
  /** Total number of pixels in the image */
  totalPixels: number;
  /** Similarity score from 0 to 1 (1 = identical) */
  similarity: number;
  /** Percentage of pixels that differ */
  mismatchPercentage: number;
  /** Path to the generated diff image (if differences found) */
  diffImagePath: string | null;
  /** Width of the compared images */
  width: number;
  /** Height of the compared images */
  height: number;
  /** Error message if comparison failed */
  error?: string;
}

/**
 * Options for screenshot comparison
 */
export interface ComparisonOptions {
  /** 
   * Threshold for pixel matching (0-1). 
   * Lower = more strict, higher = more tolerant.
   * Default: 0.1 (10% tolerance per pixel)
   */
  threshold?: number;
  
  /**
   * Include anti-aliasing detection.
   * When true, ignores pixels that appear to be anti-aliased.
   * Default: true
   */
  includeAA?: boolean;
  
  /**
   * Alpha channel threshold for comparison.
   * Default: 0.1
   */
  alpha?: number;
  
  /**
   * Color of differing pixels in the diff image (RGB array).
   * Default: [255, 0, 0] (red)
   */
  diffColor?: [number, number, number];
  
  /**
   * Color for anti-aliased pixels in the diff image (RGB array).
   * Default: [255, 255, 0] (yellow)
   */
  aaColor?: [number, number, number];
  
  /**
   * Directory to save diff images.
   * Default: './diffs'
   */
  diffOutputDir?: string;
  
  /**
   * Maximum percentage of mismatched pixels to still consider a match.
   * Default: 0 (exact match required)
   */
  maxMismatchPercentage?: number;
}

/**
 * Default comparison options
 */
const DEFAULT_OPTIONS: Required<ComparisonOptions> = {
  threshold: 0.1,
  includeAA: true,
  alpha: 0.1,
  diffColor: [255, 0, 0],
  aaColor: [255, 255, 0],
  diffOutputDir: './diffs',
  maxMismatchPercentage: 0,
};

/**
 * Screenshot comparison tool for detecting UI changes and error states.
 * 
 * @example
 * ```typescript
 * const comparator = new ScreenshotComparator({ threshold: 0.1 });
 * const result = await comparator.compare('baseline.png', 'current.png');
 * 
 * if (!result.match) {
 *   console.log(`UI changed! ${result.mismatchPercentage}% different`);
 *   console.log(`Diff saved to: ${result.diffImagePath}`);
 * }
 * ```
 */
export class ScreenshotComparator {
  private options: Required<ComparisonOptions>;

  /**
   * Create a new ScreenshotComparator instance
   * @param options - Comparison options
   */
  constructor(options: ComparisonOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Compare two images and return a similarity score and diff image
   * 
   * @param baselinePath - Path to the baseline (golden) image
   * @param currentPath - Path to the current image to compare
   * @param outputName - Optional name for the diff output file
   * @returns ComparisonResult with match status, similarity score, and diff path
   */
  async compare(
    baselinePath: string,
    currentPath: string,
    outputName?: string
  ): Promise<ComparisonResult> {
    try {
      // Validate input paths
      if (!fs.existsSync(baselinePath)) {
        return this.errorResult(`Baseline image not found: ${baselinePath}`);
      }
      if (!fs.existsSync(currentPath)) {
        return this.errorResult(`Current image not found: ${currentPath}`);
      }

      // Load images
      const [baseline, current] = await Promise.all([
        this.loadImage(baselinePath),
        this.loadImage(currentPath),
      ]);

      // Validate image dimensions
      if (baseline.width !== current.width || baseline.height !== current.height) {
        return this.errorResult(
          `Image dimensions don't match: baseline (${baseline.width}x${baseline.height}) vs current (${current.width}x${current.height})`
        );
      }

      const { width, height } = baseline;
      const totalPixels = width * height;

      // Create diff image buffer
      const diff = new PNG({ width, height });

      // Run pixel comparison
      const mismatchedPixels = pixelmatch(
        baseline.data,
        current.data,
        diff.data,
        width,
        height,
        {
          threshold: this.options.threshold,
          includeAA: this.options.includeAA,
          alpha: this.options.alpha,
          diffColor: this.options.diffColor,
          aaColor: this.options.aaColor,
        }
      );

      // Calculate metrics
      const mismatchPercentage = (mismatchedPixels / totalPixels) * 100;
      const similarity = 1 - mismatchedPixels / totalPixels;
      const match = mismatchPercentage <= this.options.maxMismatchPercentage;

      // Save diff image if there are differences
      let diffImagePath: string | null = null;
      if (mismatchedPixels > 0) {
        diffImagePath = await this.saveDiffImage(
          diff,
          baselinePath,
          currentPath,
          outputName
        );
      }

      return {
        match,
        mismatchedPixels,
        totalPixels,
        similarity,
        mismatchPercentage,
        diffImagePath,
        width,
        height,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResult(`Comparison failed: ${message}`);
    }
  }

  /**
   * Compare image buffers directly (useful for in-memory images)
   * 
   * @param baselineBuffer - Buffer containing the baseline PNG image
   * @param currentBuffer - Buffer containing the current PNG image
   * @param outputName - Optional name for the diff output file
   * @returns ComparisonResult with match status, similarity score, and diff path
   */
  async compareBuffers(
    baselineBuffer: Buffer,
    currentBuffer: Buffer,
    outputName?: string
  ): Promise<ComparisonResult> {
    try {
      // Parse buffers as PNG
      const baseline = PNG.sync.read(baselineBuffer);
      const current = PNG.sync.read(currentBuffer);

      // Validate image dimensions
      if (baseline.width !== current.width || baseline.height !== current.height) {
        return this.errorResult(
          `Image dimensions don't match: baseline (${baseline.width}x${baseline.height}) vs current (${current.width}x${current.height})`
        );
      }

      const { width, height } = baseline;
      const totalPixels = width * height;

      // Create diff image buffer
      const diff = new PNG({ width, height });

      // Run pixel comparison
      const mismatchedPixels = pixelmatch(
        baseline.data,
        current.data,
        diff.data,
        width,
        height,
        {
          threshold: this.options.threshold,
          includeAA: this.options.includeAA,
          alpha: this.options.alpha,
          diffColor: this.options.diffColor,
          aaColor: this.options.aaColor,
        }
      );

      // Calculate metrics
      const mismatchPercentage = (mismatchedPixels / totalPixels) * 100;
      const similarity = 1 - mismatchedPixels / totalPixels;
      const match = mismatchPercentage <= this.options.maxMismatchPercentage;

      // Save diff image if there are differences
      let diffImagePath: string | null = null;
      if (mismatchedPixels > 0) {
        const timestamp = Date.now();
        const name = outputName || `buffer-diff-${timestamp}`;
        diffImagePath = await this.saveDiffImageFromPNG(diff, name);
      }

      return {
        match,
        mismatchedPixels,
        totalPixels,
        similarity,
        mismatchPercentage,
        diffImagePath,
        width,
        height,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResult(`Buffer comparison failed: ${message}`);
    }
  }

  /**
   * Get a diff image as a buffer (without saving to disk)
   * 
   * @param baselineBuffer - Buffer containing the baseline PNG image
   * @param currentBuffer - Buffer containing the current PNG image
   * @returns Object with comparison result and diff buffer
   */
  getDiffBuffer(
    baselineBuffer: Buffer,
    currentBuffer: Buffer
  ): { result: Omit<ComparisonResult, 'diffImagePath'>; diffBuffer: Buffer | null } {
    try {
      // Parse buffers as PNG
      const baseline = PNG.sync.read(baselineBuffer);
      const current = PNG.sync.read(currentBuffer);

      // Validate image dimensions
      if (baseline.width !== current.width || baseline.height !== current.height) {
        return {
          result: {
            match: false,
            mismatchedPixels: 0,
            totalPixels: 0,
            similarity: 0,
            mismatchPercentage: 100,
            width: baseline.width,
            height: baseline.height,
            error: `Image dimensions don't match`,
          },
          diffBuffer: null,
        };
      }

      const { width, height } = baseline;
      const totalPixels = width * height;

      // Create diff image buffer
      const diff = new PNG({ width, height });

      // Run pixel comparison
      const mismatchedPixels = pixelmatch(
        baseline.data,
        current.data,
        diff.data,
        width,
        height,
        {
          threshold: this.options.threshold,
          includeAA: this.options.includeAA,
          alpha: this.options.alpha,
          diffColor: this.options.diffColor,
          aaColor: this.options.aaColor,
        }
      );

      // Calculate metrics
      const mismatchPercentage = (mismatchedPixels / totalPixels) * 100;
      const similarity = 1 - mismatchedPixels / totalPixels;
      const match = mismatchPercentage <= this.options.maxMismatchPercentage;

      // Generate diff buffer
      const diffBuffer = mismatchedPixels > 0 ? PNG.sync.write(diff) : null;

      return {
        result: {
          match,
          mismatchedPixels,
          totalPixels,
          similarity,
          mismatchPercentage,
          width,
          height,
        },
        diffBuffer,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        result: {
          match: false,
          mismatchedPixels: 0,
          totalPixels: 0,
          similarity: 0,
          mismatchPercentage: 100,
          width: 0,
          height: 0,
          error: message,
        },
        diffBuffer: null,
      };
    }
  }

  /**
   * Load a PNG image from file
   */
  private loadImage(imagePath: string): Promise<PNG> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(imagePath);
      const png = new PNG();
      
      stream
        .pipe(png)
        .on('parsed', () => resolve(png))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Save a diff image to disk
   */
  private async saveDiffImage(
    diff: PNG,
    baselinePath: string,
    currentPath: string,
    outputName?: string
  ): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(this.options.diffOutputDir)) {
      fs.mkdirSync(this.options.diffOutputDir, { recursive: true });
    }

    // Generate output filename
    const timestamp = Date.now();
    const baseName = outputName || 
      `diff-${path.basename(baselinePath, '.png')}-vs-${path.basename(currentPath, '.png')}-${timestamp}`;
    const outputPath = path.join(this.options.diffOutputDir, `${baseName}.png`);

    // Write diff image
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outputPath);
      diff.pack()
        .pipe(stream)
        .on('finish', () => resolve(outputPath))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Save a diff image from PNG object
   */
  private async saveDiffImageFromPNG(diff: PNG, name: string): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(this.options.diffOutputDir)) {
      fs.mkdirSync(this.options.diffOutputDir, { recursive: true });
    }

    const outputPath = path.join(this.options.diffOutputDir, `${name}.png`);

    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outputPath);
      diff.pack()
        .pipe(stream)
        .on('finish', () => resolve(outputPath))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Create an error result object
   */
  private errorResult(error: string): ComparisonResult {
    return {
      match: false,
      mismatchedPixels: 0,
      totalPixels: 0,
      similarity: 0,
      mismatchPercentage: 100,
      diffImagePath: null,
      width: 0,
      height: 0,
      error,
    };
  }

  /**
   * Update comparison options
   */
  setOptions(options: Partial<ComparisonOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current comparison options
   */
  getOptions(): Required<ComparisonOptions> {
    return { ...this.options };
  }
}

/**
 * Create a pre-configured comparator for strict matching
 * (useful for detecting any UI changes)
 */
export function createStrictComparator(diffOutputDir?: string): ScreenshotComparator {
  return new ScreenshotComparator({
    threshold: 0.01,
    includeAA: false,
    maxMismatchPercentage: 0,
    diffOutputDir: diffOutputDir || './diffs',
  });
}

/**
 * Create a pre-configured comparator for tolerant matching
 * (useful for ignoring minor rendering differences)
 */
export function createTolerantComparator(
  maxMismatchPercentage: number = 1,
  diffOutputDir?: string
): ScreenshotComparator {
  return new ScreenshotComparator({
    threshold: 0.2,
    includeAA: true,
    maxMismatchPercentage,
    diffOutputDir: diffOutputDir || './diffs',
  });
}

export default ScreenshotComparator;

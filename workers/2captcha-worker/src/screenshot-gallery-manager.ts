import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ScreenshotMetadata {
  filename: string;
  timestamp: number;
  url: string;
  captchaType?: string;
  accountId?: string;
  success?: boolean;
  size: number;
  resolution?: { width: number; height: number };
}

interface ScreenshotGalleryConfig {
  screenshotDir: string;
  maxAgeDays: number;
  maxSizeMB: number;
  cloudSyncEnabled: boolean;
  primaryStorage: 'gitlab' | 's3' | 'r2' | 'drive';
  secondaryStorage?: 'drive' | 's3' | 'r2' | 'dropbox';
  gitlabConfig?: {
    projectId: string;
    token: string;
    branch?: string;
  };
  secondaryConfig?: {
    type: string;
    credentials: any;
  };
}

export class ScreenshotGalleryManager {
  private config: ScreenshotGalleryConfig;
  private metadataCache: Map<string, ScreenshotMetadata> = new Map();

  constructor(config?: Partial<ScreenshotGalleryConfig>) {
    this.config = {
      screenshotDir: './screenshots/gallery',
      maxAgeDays: 7,
      maxSizeMB: 1000,
      cloudSyncEnabled: false,
      primaryStorage: 'gitlab',
      ...config
    };

    this.ensureDirectoryExists();
    this.loadMetadataCache();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.config.screenshotDir)) {
      fs.mkdirSync(this.config.screenshotDir, { recursive: true });
    }
  }

  private loadMetadataCache(): void {
    const metadataPath = path.join(this.config.screenshotDir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        this.metadataCache = new Map(Object.entries(data));
      } catch (error) {
        console.error('Failed to load metadata cache:', error);
      }
    }
  }

  private saveMetadataCache(): void {
    const metadataPath = path.join(this.config.screenshotDir, 'metadata.json');
    const data = Object.fromEntries(this.metadataCache);
    fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
  }

  /**
   * Add screenshot to gallery with metadata
   */
  async addScreenshot(
    filepath: string, 
    metadata: Partial<ScreenshotMetadata>
  ): Promise<void> {
    const stats = fs.statSync(filepath);
    const fullMetadata: ScreenshotMetadata = {
      filename: path.basename(filepath),
      timestamp: Date.now(),
      url: metadata.url || 'unknown',
      captchaType: metadata.captchaType,
      accountId: metadata.accountId,
      success: metadata.success,
      size: stats.size,
      resolution: metadata.resolution
    };

    this.metadataCache.set(fullMetadata.filename, fullMetadata);
    this.saveMetadataCache();

    if (this.config.cloudSyncEnabled) {
      await this.uploadToCloud(filepath, fullMetadata);
    }

    await this.enforceCleanupPolicy();
  }

  /**
   * Get gallery entries with filtering
   */
  getGallery(options?: {
    accountId?: string;
    captchaType?: string;
    dateFrom?: number;
    dateTo?: number;
    success?: boolean;
    limit?: number;
  }): ScreenshotMetadata[] {
    let entries = Array.from(this.metadataCache.values());

    if (options?.accountId) {
      entries = entries.filter(e => e.accountId === options.accountId);
    }
    if (options?.captchaType) {
      entries = entries.filter(e => e.captchaType === options.captchaType);
    }
    if (options?.dateFrom) {
      entries = entries.filter(e => e.timestamp >= options.dateFrom!);
    }
    if (options?.dateTo) {
      entries = entries.filter(e => e.timestamp <= options.dateTo!);
    }
    if (options?.success !== undefined) {
      entries = entries.filter(e => e.success === options.success);
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  /**
   * Get gallery statistics
   */
  getStats(): {
    totalScreenshots: number;
    totalSizeMB: number;
    byAccount: Record<string, number>;
    byCaptchaType: Record<string, number>;
    successRate: number;
  } {
    const entries = Array.from(this.metadataCache.values());
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    
    const byAccount: Record<string, number> = {};
    const byCaptchaType: Record<string, number> = {};
    let successCount = 0;
    let totalWithStatus = 0;

    for (const entry of entries) {
      if (entry.accountId) {
        byAccount[entry.accountId] = (byAccount[entry.accountId] || 0) + 1;
      }
      if (entry.captchaType) {
        byCaptchaType[entry.captchaType] = (byCaptchaType[entry.captchaType] || 0) + 1;
      }
      if (entry.success !== undefined) {
        totalWithStatus++;
        if (entry.success) successCount++;
      }
    }

    return {
      totalScreenshots: entries.length,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      byAccount,
      byCaptchaType,
      successRate: totalWithStatus > 0 ? Math.round(successCount / totalWithStatus * 100) : 0
    };
  }

  /**
   * Clean up old screenshots based on policy
   */
  async enforceCleanupPolicy(): Promise<void> {
    const now = Date.now();
    const maxAgeMs = this.config.maxAgeDays * 24 * 60 * 60 * 1000;
    let totalSize = 0;

    const entries = Array.from(this.metadataCache.values());
    
    for (const entry of entries) {
      const filepath = path.join(this.config.screenshotDir, entry.filename);
      
      if (!fs.existsSync(filepath)) {
        this.metadataCache.delete(entry.filename);
        continue;
      }

      const age = now - entry.timestamp;
      totalSize += entry.size;

      if (age > maxAgeMs) {
        this.deleteScreenshot(entry.filename);
      }
    }

    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    if (totalSize > maxSizeBytes) {
      const sorted = entries
        .filter(e => fs.existsSync(path.join(this.config.screenshotDir, e.filename)))
        .sort((a, b) => a.timestamp - b.timestamp);

      while (totalSize > maxSizeBytes && sorted.length > 0) {
        const oldest = sorted.shift()!;
        this.deleteScreenshot(oldest.filename);
        totalSize -= oldest.size;
      }
    }

    this.saveMetadataCache();
  }

  private deleteScreenshot(filename: string): void {
    const filepath = path.join(this.config.screenshotDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      this.metadataCache.delete(filename);
      console.log(`🗑️  Deleted old screenshot: ${filename}`);
    }
  }

  /**
   * Upload screenshot to cloud storage
   */
  private async uploadToCloud(
    filepath: string,
    metadata: ScreenshotMetadata
  ): Promise<void> {
    if (!this.config.cloudSyncEnabled) {
      return;
    }

    try {
      if (this.config.primaryStorage === 'gitlab' && this.config.gitlabConfig) {
        await this.uploadToGitLab(filepath, metadata);
      } else if (this.config.secondaryStorage && this.config.secondaryConfig) {
        await this.uploadToSecondary(filepath, metadata);
      }
    } catch (error) {
      console.error('Cloud upload failed:', error);
    }
  }

  private async uploadToGitLab(
    filepath: string,
    metadata: ScreenshotMetadata
  ): Promise<void> {
    if (!this.config.gitlabConfig) return;

    const { projectId, token, branch = 'main' } = this.config.gitlabConfig;
    const filename = metadata.filename;
    const content = fs.readFileSync(filepath, 'base64');

    try {
      const response = await fetch(
        `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/screenshots%2F${filename}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            branch,
            content,
            encoding: 'base64',
            commit_message: `Add screenshot: ${filename}`,
          }),
        }
      );

      if (response.ok) {
        const publicUrl = `https://gitlab.com/${projectId}/-/blob/${branch}/screenshots/${filename}`;
        console.log(`☁️  Uploaded to GitLab: ${publicUrl}`);
      } else {
        console.error('GitLab upload failed:', await response.text());
      }
    } catch (error) {
      console.error('GitLab upload error:', error);
    }
  }

  private async uploadToSecondary(
    filepath: string,
    metadata: ScreenshotMetadata
  ): Promise<void> {
    console.log(`☁️  Secondary storage upload: ${metadata.filename}`);
  }

  /**
   * Generate HTML gallery interface
   */
  generateHTMLGallery(outputPath?: string): string {
    const entries = this.getGallery({ limit: 100 });
    const stats = this.getStats();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Screenshot Gallery</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a1a; color: #fff; }
    .header { margin-bottom: 20px; padding: 20px; background: #2a2a2a; border-radius: 8px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: #333; padding: 15px; border-radius: 8px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #4CAF50; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
    .screenshot { background: #2a2a2a; border-radius: 8px; overflow: hidden; }
    .screenshot img { width: 100%; height: 200px; object-fit: cover; }
    .screenshot-info { padding: 10px; font-size: 12px; }
    .success { color: #4CAF50; }
    .failure { color: #f44336; }
    .filters { margin-bottom: 20px; padding: 15px; background: #2a2a2a; border-radius: 8px; }
    .filters select, .filters input { margin-right: 10px; padding: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📸 Screenshot Gallery</h1>
    <p>Auto-cleanup: ${this.config.maxAgeDays} days | Max size: ${this.config.maxSizeMB}MB</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${stats.totalScreenshots}</div>
      <div>Total Screenshots</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalSizeMB}MB</div>
      <div>Total Size</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.successRate}%</div>
      <div>Success Rate</div>
    </div>
  </div>

  <div class="gallery">
    ${entries.map(entry => `
      <div class="screenshot">
        <img src="${entry.filename}" loading="lazy" 
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23333%22 width=%22100%25%22 height=%22100%25%22/><text fill=%22%23666%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>Image not found</text></svg>'"/>
        <div class="screenshot-info">
          <div>${new Date(entry.timestamp).toLocaleString()}</div>
          <div>Account: ${entry.accountId || 'N/A'}</div>
          <div>Type: ${entry.captchaType || 'N/A'}>
          ${entry.success !== undefined ? `
            <div class="${entry.success ? 'success' : 'failure'}">
              ${entry.success ? '✅ Success' : '❌ Failed'}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

    const outputFile = outputPath || path.join(this.config.screenshotDir, 'gallery.html');
    fs.writeFileSync(outputFile, html);
    console.log(`📄 Gallery generated: ${outputFile}`);
    
    return outputFile;
  }
}

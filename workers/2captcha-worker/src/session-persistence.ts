import * as fs from 'fs';
import * as path from 'path';

export interface SessionData {
  sessionId: string;
  timestamp: number;
  url: string;
  cookies: Array<{name: string; value: string; domain: string; path: string}>;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  scrollPosition: {x: number; y: number};
  formData: Record<string, string>;
}

export class SessionPersistence {
  private dataDir: string;
  private maxSessions: number;
  private currentSessionId: string | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor(dataDir: string = './session-data', maxSessions: number = 10) {
    this.dataDir = dataDir;
    this.maxSessions = maxSessions;
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async saveSession(data: Omit<SessionData, 'sessionId' | 'timestamp'>): Promise<string> {
    const sessionId = this.currentSessionId || this.generateSessionId();
    const sessionData: SessionData = {
      ...data,
      sessionId,
      timestamp: Date.now()
    };

    const filePath = path.join(this.dataDir, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
    
    this.currentSessionId = sessionId;
    this.cleanupOldSessions();
    
    return sessionId;
  }

  async restoreSession(sessionId: string): Promise<SessionData | null> {
    const filePath = path.join(this.dataDir, `${sessionId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as SessionData;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return null;
    }
  }

  async clearSession(sessionId?: string): Promise<void> {
    const id = sessionId || this.currentSessionId;
    if (!id) return;

    const filePath = path.join(this.dataDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (id === this.currentSessionId) {
      this.currentSessionId = null;
    }
  }

  startAutoSave(saveFn: () => Promise<void>, intervalMs: number = 30000): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(async () => {
      try {
        await saveFn();
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, intervalMs);
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  private cleanupOldSessions(): void {
    const files = fs.readdirSync(this.dataDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(this.dataDir, f),
        stats: fs.statSync(path.join(this.dataDir, f))
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    if (files.length > this.maxSessions) {
      files.slice(this.maxSessions).forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
  }

  listSessions(): Array<{sessionId: string; timestamp: number}> {
    return fs.readdirSync(this.dataDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(this.dataDir, f), 'utf-8'));
        return { sessionId: data.sessionId, timestamp: data.timestamp };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}

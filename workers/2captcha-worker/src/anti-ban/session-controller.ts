/**
 * Session Controller Module
 * 
 * Manages browser sessions, trust levels with Google accounts,
 * login cooldowns, and session persistence across reconnects.
 * 
 * Features:
 * - Clean logout before IP reset
 * - Trust-level management with Google accounts
 * - Login cooldown enforcement
 * - Session persistence across reconnects
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Trust level with a service/account
 */
export enum TrustLevel {
  UNKNOWN = 0,      // New session, no trust established
  LOW = 1,          // Initial interactions, limited privileges
  MEDIUM = 2,       // Some history, moderate privileges
  HIGH = 3,         // Established trust, full privileges
  VERIFIED = 4,     // Long history, maximum privileges
}

/**
 * Session state
 */
export interface SessionState {
  sessionId: string;
  accountId: string;
  service: string;
  trustLevel: TrustLevel;
  createdAt: number;
  lastActivityAt: number;
  loginCount: number;
  lastLoginAt: number | null;
  consecutiveFailures: number;
  isLoggedIn: boolean;
  cookies: Record<string, string>;
  localStorage: Record<string, string>;
  metadata: Record<string, unknown>;
}

/**
 * Login attempt record
 */
export interface LoginAttempt {
  timestamp: number;
  success: boolean;
  ip: string;
  userAgent: string;
  error?: string;
  cooldownMs: number;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  name: string;
  baseUrl: string;
  loginUrl: string;
  logoutUrl: string;
  selectors: {
    username: string;
    password: string;
    submit: string;
    logout: string;
  };
}

/**
 * Session controller configuration
 */
export interface SessionControllerConfig {
  // Trust level settings
  trustDecayTimeMs: number;        // Time before trust decays
  trustGainPerSuccess: number;     // Trust points gained per success
  trustLossPerFailure: number;     // Trust points lost per failure
  
  // Login cooldown settings
  baseLoginCooldownMs: number;     // Base cooldown between logins
  maxLoginCooldownMs: number;      // Maximum cooldown
  cooldownMultiplierPerFailure: number;
  
  // Session persistence
  sessionTimeoutMs: number;        // Session expires after inactivity
  autoLogoutBeforeIPChange: boolean;
  
  // Storage
  stateFilePath: string;
  sessionsDir: string;
  
  // Services
  services: ServiceConfig[];
}

/**
 * Default session controller configuration
 */
export const DEFAULT_SESSION_CONTROLLER_CONFIG: SessionControllerConfig = {
  trustDecayTimeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  trustGainPerSuccess: 10,
  trustLossPerFailure: 25,
  
  baseLoginCooldownMs: 5000, // 5 seconds
  maxLoginCooldownMs: 30 * 60 * 1000, // 30 minutes
  cooldownMultiplierPerFailure: 2,
  
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  autoLogoutBeforeIPChange: true,
  
  stateFilePath: './data/session-controller-state.json',
  sessionsDir: './data/sessions',
  
  services: [
    {
      name: '2captcha',
      baseUrl: 'https://2captcha.com',
      loginUrl: 'https://2captcha.com/auth/login',
      logoutUrl: 'https://2captcha.com/auth/logout',
      selectors: {
        username: 'input[name="email"], input[type="email"]',
        password: 'input[name="password"], input[type="password"]',
        submit: 'button[type="submit"], input[type="submit"]',
        logout: 'a[href*="logout"], button[data-action="logout"]',
      },
    },
  ],
};

/**
 * Session controller class
 * Manages sessions, trust levels, and login state
 */
export class SessionController extends EventEmitter {
  private config: SessionControllerConfig;
  private sessions: Map<string, SessionState> = new Map();
  private loginHistory: Map<string, LoginAttempt[]> = new Map();
  private currentSession: SessionState | null = null;

  constructor(config: Partial<SessionControllerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SESSION_CONTROLLER_CONFIG, ...config };
    this.ensureDataDirectory();
    this.loadState();
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.config.sessionsDir)) {
      fs.mkdirSync(this.config.sessionsDir, { recursive: true });
    }
    const stateDir = path.dirname(this.config.stateFilePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
  }

  /**
   * Load state from disk
   */
  private loadState(): void {
    try {
      // Load sessions index
      if (fs.existsSync(this.config.stateFilePath)) {
        const data = fs.readFileSync(this.config.stateFilePath, 'utf-8');
        const state = JSON.parse(data) as {
          sessions: SessionState[];
          currentSessionId: string | null;
        };
        
        // Restore sessions
        for (const session of state.sessions) {
          // Check if session is still valid (not expired)
          const inactiveTime = Date.now() - session.lastActivityAt;
          if (inactiveTime < this.config.sessionTimeoutMs) {
            this.sessions.set(session.sessionId, session);
          }
        }
        
        // Restore current session
        if (state.currentSessionId) {
          this.currentSession = this.sessions.get(state.currentSessionId) || null;
        }
      }
      
      // Load individual session files
      this.loadSessionFiles();
    } catch (error) {
      this.emit('error', { type: 'load-state', error });
    }
  }

  /**
   * Load session files from disk
   */
  private loadSessionFiles(): void {
    try {
      const files = fs.readdirSync(this.config.sessionsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          
          // Skip if already loaded
          if (this.sessions.has(sessionId)) continue;
          
          const filePath = path.join(this.config.sessionsDir, file);
          const data = fs.readFileSync(filePath, 'utf-8');
          const session = JSON.parse(data) as SessionState;
          
          // Check if session is still valid
          const inactiveTime = Date.now() - session.lastActivityAt;
          if (inactiveTime < this.config.sessionTimeoutMs) {
            this.sessions.set(sessionId, session);
          } else {
            // Delete expired session file
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (error) {
      this.emit('error', { type: 'load-session-files', error });
    }
  }

  /**
   * Save state to disk
   */
  private saveState(): void {
    try {
      const state = {
        sessions: Array.from(this.sessions.values()),
        currentSessionId: this.currentSession?.sessionId || null,
      };
      
      fs.writeFileSync(
        this.config.stateFilePath,
        JSON.stringify(state, null, 2)
      );
    } catch (error) {
      this.emit('error', { type: 'save-state', error });
    }
  }

  /**
   * Save individual session to file
   */
  private saveSession(session: SessionState): void {
    try {
      const filePath = path.join(this.config.sessionsDir, `${session.sessionId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    } catch (error) {
      this.emit('error', { type: 'save-session', error });
    }
  }

  /**
   * Create a new session
   */
  createSession(accountId: string, service: string): SessionState {
    const sessionId = `${service}-${accountId}-${Date.now()}`;
    
    const session: SessionState = {
      sessionId,
      accountId,
      service,
      trustLevel: TrustLevel.UNKNOWN,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      loginCount: 0,
      lastLoginAt: null,
      consecutiveFailures: 0,
      isLoggedIn: false,
      cookies: {},
      localStorage: {},
      metadata: {},
    };
    
    this.sessions.set(sessionId, session);
    this.saveSession(session);
    this.saveState();
    
    this.emit('session-created', { sessionId, accountId, service });
    
    return session;
  }

  /**
   * Get or create session for account
   */
  getOrCreateSession(accountId: string, service: string): SessionState {
    // Look for existing session
    for (const session of this.sessions.values()) {
      if (session.accountId === accountId && session.service === service) {
        // Check if session is still valid
        const inactiveTime = Date.now() - session.lastActivityAt;
        if (inactiveTime < this.config.sessionTimeoutMs) {
          return session;
        }
      }
    }
    
    // Create new session
    return this.createSession(accountId, service);
  }

  /**
   * Set current active session
   */
  setCurrentSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    this.currentSession = session;
    this.saveState();
    
    this.emit('session-activated', { sessionId });
    return true;
  }

  /**
   * Get current session
   */
  getCurrentSession(): SessionState | null {
    return this.currentSession;
  }

  /**
   * Update session activity
   */
  private updateActivity(session: SessionState): void {
    session.lastActivityAt = Date.now();
    this.saveSession(session);
  }

  /**
   * Record login attempt
   */
  recordLoginAttempt(
    accountId: string,
    success: boolean,
    ip: string,
    userAgent: string,
    error?: string
  ): void {
    const attempts = this.loginHistory.get(accountId) || [];
    
    const attempt: LoginAttempt = {
      timestamp: Date.now(),
      success,
      ip,
      userAgent,
      error,
      cooldownMs: this.calculateLoginCooldown(accountId),
    };
    
    attempts.push(attempt);
    
    // Keep only last 100 attempts
    if (attempts.length > 100) {
      attempts.shift();
    }
    
    this.loginHistory.set(accountId, attempts);
    
    // Update session if exists
    const session = this.getSessionForAccount(accountId);
    if (session) {
      if (success) {
        session.loginCount++;
        session.lastLoginAt = Date.now();
        session.consecutiveFailures = 0;
        session.isLoggedIn = true;
        this.increaseTrust(session);
      } else {
        session.consecutiveFailures++;
        this.decreaseTrust(session);
      }
      
      this.updateActivity(session);
      this.saveSession(session);
    }
    
    this.emit('login-attempt', { accountId, success, error });
  }

  /**
   * Get session for account
   */
  private getSessionForAccount(accountId: string): SessionState | null {
    for (const session of this.sessions.values()) {
      if (session.accountId === accountId) {
        return session;
      }
    }
    return null;
  }

  /**
   * Calculate login cooldown based on failure history
   */
  calculateLoginCooldown(accountId: string): number {
    const attempts = this.loginHistory.get(accountId) || [];
    const recentFailures = attempts
      .filter(a => !a.success && Date.now() - a.timestamp < 24 * 60 * 60 * 1000)
      .length;
    
    let cooldown = this.config.baseLoginCooldownMs;
    
    for (let i = 0; i < recentFailures; i++) {
      cooldown *= this.config.cooldownMultiplierPerFailure;
    }
    
    return Math.min(cooldown, this.config.maxLoginCooldownMs);
  }

  /**
   * Check if login is allowed (cooldown expired)
   */
  canLogin(accountId: string): { allowed: boolean; remainingMs: number } {
    const attempts = this.loginHistory.get(accountId) || [];
    const lastAttempt = attempts[attempts.length - 1];
    
    if (!lastAttempt) {
      return { allowed: true, remainingMs: 0 };
    }
    
    const cooldown = this.calculateLoginCooldown(accountId);
    const elapsed = Date.now() - lastAttempt.timestamp;
    const remaining = Math.max(0, cooldown - elapsed);
    
    return { allowed: remaining === 0, remainingMs: remaining };
  }

  /**
   * Wait for login cooldown
   */
  async waitForLoginCooldown(accountId: string): Promise<void> {
    while (true) {
      const { allowed, remainingMs } = this.canLogin(accountId);
      
      if (allowed) {
        break;
      }
      
      this.emit('login-cooldown-waiting', { accountId, remainingMs });
      
      // Wait in chunks of 5 seconds
      const waitTime = Math.min(5000, remainingMs);
      await this.sleep(waitTime);
    }
  }

  /**
   * Increase trust level
   */
  private increaseTrust(session: SessionState): void {
    const oldLevel = session.trustLevel;
    
    // Calculate trust points
    const points = this.config.trustGainPerSuccess;
    
    // Convert points to trust level
    // 0-25: UNKNOWN, 25-50: LOW, 50-75: MEDIUM, 75-100: HIGH, 100+: VERIFIED
    const totalPoints = this.calculateTrustPoints(session) + points;
    
    if (totalPoints >= 100) {
      session.trustLevel = TrustLevel.VERIFIED;
    } else if (totalPoints >= 75) {
      session.trustLevel = TrustLevel.HIGH;
    } else if (totalPoints >= 50) {
      session.trustLevel = TrustLevel.MEDIUM;
    } else if (totalPoints >= 25) {
      session.trustLevel = TrustLevel.LOW;
    }
    
    if (session.trustLevel !== oldLevel) {
      this.emit('trust-level-changed', {
        sessionId: session.sessionId,
        oldLevel,
        newLevel: session.trustLevel,
      });
    }
  }

  /**
   * Decrease trust level
   */
  private decreaseTrust(session: SessionState): void {
    const oldLevel = session.trustLevel;
    
    // Calculate trust points
    const points = this.config.trustLossPerFailure;
    const totalPoints = Math.max(0, this.calculateTrustPoints(session) - points);
    
    // Convert points to trust level
    if (totalPoints >= 100) {
      session.trustLevel = TrustLevel.VERIFIED;
    } else if (totalPoints >= 75) {
      session.trustLevel = TrustLevel.HIGH;
    } else if (totalPoints >= 50) {
      session.trustLevel = TrustLevel.MEDIUM;
    } else if (totalPoints >= 25) {
      session.trustLevel = TrustLevel.LOW;
    } else {
      session.trustLevel = TrustLevel.UNKNOWN;
    }
    
    if (session.trustLevel !== oldLevel) {
      this.emit('trust-level-changed', {
        sessionId: session.sessionId,
        oldLevel,
        newLevel: session.trustLevel,
      });
    }
  }

  /**
   * Calculate trust points based on level
   */
  private calculateTrustPoints(session: SessionState): number {
    switch (session.trustLevel) {
      case TrustLevel.VERIFIED: return 100;
      case TrustLevel.HIGH: return 75;
      case TrustLevel.MEDIUM: return 50;
      case TrustLevel.LOW: return 25;
      case TrustLevel.UNKNOWN: return 0;
      default: return 0;
    }
  }

  /**
   * Perform clean logout
   */
  async performCleanLogout(
    navigateFn: (url: string) => Promise<void>,
    clickFn: (selector: string) => Promise<void>,
    waitFn: (ms: number) => Promise<void>
  ): Promise<boolean> {
    if (!this.currentSession || !this.currentSession.isLoggedIn) {
      return true; // Already logged out
    }
    
    try {
      this.emit('logout-start', { sessionId: this.currentSession.sessionId });
      
      // Get service config
      const service = this.config.services.find(
        s => s.name === this.currentSession!.service
      );
      
      if (service) {
        // Navigate to logout URL
        await navigateFn(service.logoutUrl);
        await waitFn(2000);
        
        // Try to click logout button if present
        try {
          await clickFn(service.selectors.logout);
          await waitFn(1000);
        } catch {
          // Logout button might not be present, that's okay
        }
      }
      
      // Update session
      this.currentSession.isLoggedIn = false;
      this.currentSession.cookies = {};
      this.currentSession.localStorage = {};
      this.updateActivity(this.currentSession);
      
      this.emit('logout-complete', { sessionId: this.currentSession.sessionId });
      
      return true;
    } catch (error) {
      this.emit('logout-error', { sessionId: this.currentSession?.sessionId, error });
      return false;
    }
  }

  /**
   * Prepare for IP change (logout if needed)
   */
  async prepareForIPChange(
    navigateFn: (url: string) => Promise<void>,
    clickFn: (selector: string) => Promise<void>,
    waitFn: (ms: number) => Promise<void>
  ): Promise<void> {
    if (this.config.autoLogoutBeforeIPChange && this.currentSession?.isLoggedIn) {
      await this.performCleanLogout(navigateFn, clickFn, waitFn);
    }
  }

  /**
   * Save session data (cookies, localStorage)
   */
  saveSessionData(
    cookies: Record<string, string>,
    localStorage: Record<string, string>
  ): void {
    if (!this.currentSession) {
      return;
    }
    
    this.currentSession.cookies = cookies;
    this.currentSession.localStorage = localStorage;
    this.updateActivity(this.currentSession);
    
    this.emit('session-data-saved', { sessionId: this.currentSession.sessionId });
  }

  /**
   * Restore session data
   */
  restoreSessionData(): { cookies: Record<string, string>; localStorage: Record<string, string> } | null {
    if (!this.currentSession) {
      return null;
    }
    
    return {
      cookies: this.currentSession.cookies,
      localStorage: this.currentSession.localStorage,
    };
  }

  /**
   * Get trust level name
   */
  getTrustLevelName(level: TrustLevel): string {
    switch (level) {
      case TrustLevel.UNKNOWN: return 'Unknown';
      case TrustLevel.LOW: return 'Low';
      case TrustLevel.MEDIUM: return 'Medium';
      case TrustLevel.HIGH: return 'High';
      case TrustLevel.VERIFIED: return 'Verified';
      default: return 'Unknown';
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    loginCount: number;
    trustLevel: string;
    consecutiveFailures: number;
    sessionAgeMs: number;
    lastActivityMs: number;
    isLoggedIn: boolean;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    
    return {
      loginCount: session.loginCount,
      trustLevel: this.getTrustLevelName(session.trustLevel),
      consecutiveFailures: session.consecutiveFailures,
      sessionAgeMs: Date.now() - session.createdAt,
      lastActivityMs: Date.now() - session.lastActivityAt,
      isLoggedIn: session.isLoggedIn,
    };
  }

  /**
   * Get all sessions
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    this.sessions.delete(sessionId);
    
    // Delete session file
    try {
      const filePath = path.join(this.config.sessionsDir, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.emit('error', { type: 'delete-session-file', error });
    }
    
    if (this.currentSession?.sessionId === sessionId) {
      this.currentSession = null;
    }
    
    this.saveState();
    this.emit('session-deleted', { sessionId });
    
    return true;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    let deleted = 0;
    const now = Date.now();
    
    for (const [sessionId, session] of this.sessions) {
      const inactiveTime = now - session.lastActivityAt;
      if (inactiveTime >= this.config.sessionTimeoutMs) {
        this.deleteSession(sessionId);
        deleted++;
      }
    }
    
    return deleted;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.saveState();
    this.removeAllListeners();
  }
}

export default SessionController;

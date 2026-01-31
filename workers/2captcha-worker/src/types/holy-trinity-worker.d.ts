declare module '../holy-trinity-worker' {
  interface BrowserSessionSnapshot {
    sessionId: string;
    capturedAt: string;
    url: string;
    cookies: any[];
    localStorage: Record<string, string>;
    metadata?: Record<string, unknown>;
  }
}

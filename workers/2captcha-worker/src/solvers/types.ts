/**
 * Multi-Agent CAPTCHA Solver Types
 * 3-Agent System mit verschiedenen Modellen für robuste CAPTCHA-Lösung
 */

/**
 * Ergebnis eines einzelnen Solvers
 * Alle Agents geben dieses Format zurück
 */
export interface SolverResult {
  /** Die gelöste CAPTCHA-Antwort */
  answer: string;

  /** Konfidenzwert 0.0 - 1.0 */
  confidence: number;

  /** Welches Modell verwendet wurde */
  model: string;

  /** Verarbeitungszeit in Millisekunden */
  time: number;

  /** Optional: Agent identifier (alias for model) */
  agent?: string;

  /** Optional: Fehlerdetails bei Fehler */
  error?: string;

  /** Optional: Zusätzliche Metadaten */
  metadata?: Record<string, any>;
}

/**
 * Interface für einen einzelnen Solver
 */
export interface ICapatchaSolver {
  solve(captchaImage: Buffer): Promise<SolverResult>;
  name: string;
}

/**
 * Multi-Agent Solver Optionen
 */
export interface MultiAgentSolverOptions {
  /** Timeout in Millisekunden pro Agent (Standard: 30000) */
  timeout?: number;
  
  /** Minimale Konfidenz, um eine Lösung zu akzeptieren (Standard: 0.7) */
  minConfidence?: number;
  
  /** Sollte parallele oder sequenzielle Ausführung verwenden */
  parallel?: boolean;
}

/**
 * Ergebnis vom Multi-Agent System
 */
export interface MultiAgentResult {
  /** Alle Ergebnisse der 3 Agenten */
  results: SolverResult[];
  
  /** Best Result (nach Konfidenz sortiert) */
  bestResult: SolverResult;
  
  /** Gültige Ergebnisse (Konfidenz >= minConfidence) */
  validResults: SolverResult[];
  
  /** Konsenslösung wenn mehrere Agenten gleich antworten */
  consensus?: {
    answer: string;
    agentCount: number;
    confidence: number;
  };
  
  /** Gesamte Verarbeitungszeit */
  totalTime: number;
}

/**
 * Skyvern Vision Solver Konfiguration
 */
export interface SkyvernConfig {
  apiUrl?: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * GPT-4V / Claude Vision Solver Konfiguration
 */
export interface VisionModelConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  timeout?: number;
}

/**
 * ddddocr Solver Konfiguration
 */
export interface DDDDOCRConfig {
  timeout?: number;
  pythonPath?: string;
}

/**
 * Agent 3: ddddocr Local OCR Solver
 * Verwendet ddddocr (Open-Source Python OCR) für offline CAPTCHA-Lösung
 * Lokale Ausführung, keine API Anfragen
 */

import { ICapatchaSolver, SolverResult, DDDDOCRConfig } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class DDDDOCRSolver implements ICapatchaSolver {
  name = 'ddddocr-local';
  private config: DDDDOCRConfig;
  private timeout: number;
  private pythonPath: string;
  private solverScriptPath: string;

  constructor(config: DDDDOCRConfig = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      pythonPath: config.pythonPath || 'python3',
    };
    this.timeout = this.config.timeout!;
    this.pythonPath = this.config.pythonPath!;

    // Pfad zum Python Solver Script
    this.solverScriptPath = path.join(__dirname, 'ddddocr_solver.py');
  }

  /**
   * Löst CAPTCHA mit ddddocr (lokaler OCR)
   * Speichert Image temporär, führt Python Script aus, liest Ergebnis
   * @param captchaImage Buffer mit CAPTCHA-Bild
   * @returns SolverResult mit Antwort und Konfidenz
   */
  async solve(captchaImage: Buffer): Promise<SolverResult> {
    const startTime = Date.now();
    const tempImagePath = path.join('/tmp', `captcha_${Date.now()}.png`);

    try {
      // 1. Speichere Image temporär
      await this.writeImageToFile(captchaImage, tempImagePath);

      // 2. Rufe ddddocr Python Script auf
      const result = await this.callDDDDOCR(tempImagePath);

      const time = Date.now() - startTime;

      return {
        answer: result.answer || '',
        confidence: result.confidence || 0.75,
        model: 'ddddocr-ocr',
        time,
      };
    } catch (error) {
      const time = Date.now() - startTime;
      console.error('[DDDDOCRSolver] Fehler:', error);

      return {
        answer: '',
        confidence: 0,
        model: 'ddddocr-ocr',
        time,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    } finally {
      // Cleanup: Lösche temporäres Image
      try {
        if (fs.existsSync(tempImagePath)) {
          fs.unlinkSync(tempImagePath);
        }
      } catch (e) {
        // Fehler beim Löschen ignorieren
      }
    }
  }

  /**
   * Schreibt Image Buffer in Datei
   * @private
   */
  private writeImageToFile(buffer: Buffer, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, buffer, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Ruft ddddocr Python Script auf
   * @private
   */
  private async callDDDDOCR(imagePath: string): Promise<any> {
    try {
      // Python Script wird inline aufgerufen mit Timeout
      const command = `${this.pythonPath} -c "
import sys
import json
try:
    from ddddocr import DdddOcr
    ocr = DdddOcr()
    with open('${imagePath}', 'rb') as f:
        result = ocr.classification(f.read())
    print(json.dumps({
        'answer': result,
        'confidence': 0.8
    }))
except Exception as e:
    print(json.dumps({
        'answer': '',
        'confidence': 0,
        'error': str(e)
    }))
" 2>&1`;

      const { stdout } = await execAsync(command, {
        timeout: this.timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB Buffer
      });

      const result = JSON.parse(stdout.trim());
      return result;
    } catch (error) {
      throw new Error(`ddddocr execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Factory function für ddddocr Solver
 */
export function createDDDDOCRSolver(config?: DDDDOCRConfig): DDDDOCRSolver {
  return new DDDDOCRSolver(config);
}

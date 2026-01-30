/**
 * Visual Mouse Tracker for Skyvern/Playwright
 * 
 * Zeigt einen visuellen Mauszeiger auf der Seite
 * 1:1 Nachverfolgung ohne System zu beeinflussen
 */

import { Page } from 'playwright';

export class VisualMouseTracker {
  private page: Page;
  private isActive = false;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Aktiviert visuellen Mauszeiger auf der Seite
   */
  async activate(): Promise<void> {
    if (this.isActive) return;

    // Füge CSS und HTML für visuellen Cursor hinzu
    await this.page.addStyleTag({
      content: `
        .skyvern-mouse-cursor {
          position: fixed;
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #ff0000 30%, #ff6600 70%, transparent 100%);
          border: 2px solid #fff;
          border-radius: 50%;
          pointer-events: none;
          z-index: 999999;
          transition: all 0.1s ease-out;
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 0, 0, 0.4);
          transform: translate(-50%, -50%);
        }
        .skyvern-mouse-trail {
          position: fixed;
          width: 8px;
          height: 8px;
          background: rgba(255, 100, 0, 0.6);
          border-radius: 50%;
          pointer-events: none;
          z-index: 999998;
          transition: opacity 0.5s;
        }
        .skyvern-click-effect {
          position: fixed;
          width: 40px;
          height: 40px;
          border: 3px solid #00ff00;
          border-radius: 50%;
          pointer-events: none;
          z-index: 999997;
          animation: skyvern-click-pulse 0.6s ease-out forwards;
          transform: translate(-50%, -50%);
        }
        @keyframes skyvern-click-pulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        .skyvern-action-label {
          position: fixed;
          background: rgba(0, 0, 0, 0.8);
          color: #00ff00;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          pointer-events: none;
          z-index: 999999;
          white-space: nowrap;
          transform: translate(15px, -30px);
        }
      `
    });

    // Erstelle Cursor Element
    await this.page.evaluate(() => {
      const cursor = document.createElement('div');
      cursor.className = 'skyvern-mouse-cursor';
      cursor.id = 'skyvern-cursor';
      document.body.appendChild(cursor);
    });

    this.isActive = true;
    console.log('🖱️  Visual mouse tracker activated');
  }

  /**
   * Bewegt den visuellen Cursor zu Position
   */
  async moveTo(x: number, y: number, action?: string): Promise<void> {
    if (!this.isActive) await this.activate();

    await this.page.evaluate(({ x, y, action }) => {
      const cursor = document.getElementById('skyvern-cursor');
      if (cursor) {
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
      }

      // Trail erstellen
      const trail = document.createElement('div');
      trail.className = 'skyvern-mouse-trail';
      trail.style.left = x + 'px';
      trail.style.top = y + 'px';
      document.body.appendChild(trail);
      
      // Trail nach 1s entfernen
      setTimeout(() => trail.remove(), 1000);

      // Action Label anzeigen
      if (action) {
        const label = document.createElement('div');
        label.className = 'skyvern-action-label';
        label.textContent = action;
        label.style.left = x + 'px';
        label.style.top = y + 'px';
        document.body.appendChild(label);
        setTimeout(() => label.remove(), 1500);
      }
    }, { x, y, action });
  }

  /**
   * Zeigt Click-Animation
   */
  async click(x: number, y: number): Promise<void> {
    await this.page.evaluate(({ x, y }) => {
      const effect = document.createElement('div');
      effect.className = 'skyvern-click-effect';
      effect.style.left = x + 'px';
      effect.style.top = y + 'px';
      document.body.appendChild(effect);
      setTimeout(() => effect.remove(), 600);
    }, { x, y });
  }

  /**
   * Deaktiviert Tracker
   */
  async deactivate(): Promise<void> {
    await this.page.evaluate(() => {
      const cursor = document.getElementById('skyvern-cursor');
      if (cursor) cursor.remove();
    });
    this.isActive = false;
  }
}

export default VisualMouseTracker;

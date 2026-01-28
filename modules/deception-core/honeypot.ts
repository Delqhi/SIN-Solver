import { IHoneypotZone, IClickVerification } from './types';

/**
 * Honeypot Class
 * 
 * Implements spatial analysis to detect and block interaction attempts 
 * in defined "Danger Zones" while allowing them in "Safe Zones".
 * 
 * Zone Logic Diagram:
 * +---------------------------------------+
 * | [SAFE ZONE] (verified: true)          |
 * | (x, y) -> inside rectangle            |
 * +---------------------------------------+
 * | [DANGER ZONE] (verified: false)        |
 * | (x, y) -> inside rectangle            |
 * +---------------------------------------+
 * | [UNKNOWN/OTHER] (verified: false)     |
 * | (x, y) -> outside or unknown type     |
 * +---------------------------------------+
 * 
 * Point-in-Rectangle Logic:
 * x >= zone.x && x <= zone.x + zone.width && 
 * y >= zone.y && y <= zone.y + zone.height
 */
export class Honeypot {
  private zones: Map<string, IHoneypotZone>;
  private click_history: IClickVerification[];

  constructor() {
    this.zones = new Map<string, IHoneypotZone>();
    this.click_history = [];
  }

  /**
   * Adds a new spatial zone to the honeypot system.
   * @param zone The zone definition to add.
   */
  public addZone(zone: IHoneypotZone): void {
    this.zones.set(zone.id, zone);
  }

  /**
   * Verifies if a click at (x, y) is within a safe or danger zone.
   * @param x X-coordinate of the click.
   * @param y Y-coordinate of the click.
   * @returns Verification result and the zone ID if found.
   */
  public verifyClickPosition(x: number, y: number): { verified: boolean; zone_id?: string } {
    for (const zone of this.zones.values()) {
      const isInside =
        x >= zone.x &&
        x <= zone.x + zone.width &&
        y >= zone.y &&
        y <= zone.y + zone.height;

      if (isInside) {
        if (zone.type === 'SAFE') {
          return { verified: true, zone_id: zone.id };
        }
        // DANGER or UNKNOWN are considered unverified
        return { verified: false, zone_id: zone.id };
      }
    }

    // No zone found at this position
    return { verified: false };
  }

  /**
   * Blocks a click if it's in a non-safe zone and logs the attempt.
   * @param x X-coordinate of the click.
   * @param y Y-coordinate of the click.
   * @returns True if the click was blocked, false otherwise.
   */
  public blockFalseClick(x: number, y: number): boolean {
    const { verified, zone_id } = this.verifyClickPosition(x, y);

    if (!verified) {
      // Log the failed attempt
      this.click_history.push({
        before_state: { x, y, zone_id, timestamp: Date.now() },
        after_state: {}, // Empty as per requirements
        verified: false,
        confidence: 1.0
      });
      return true; // Blocked
    }

    return false; // Not blocked
  }

  /**
   * Generates a report of all safe and danger zones.
   * @returns Object containing arrays of safe and danger zones.
   */
  public getSpatialReport(): { safe_zones: IHoneypotZone[]; danger_zones: IHoneypotZone[] } {
    const safe_zones: IHoneypotZone[] = [];
    const danger_zones: IHoneypotZone[] = [];

    for (const zone of this.zones.values()) {
      if (zone.type === 'SAFE') {
        safe_zones.push(zone);
      } else if (zone.type === 'DANGER') {
        danger_zones.push(zone);
      }
    }

    return { safe_zones, danger_zones };
  }

  /**
   * Returns the history of all click verification attempts.
   * @returns Array of click verification records.
   */
  public getClickHistory(): IClickVerification[] {
    return [...this.click_history];
  }
}

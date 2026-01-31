# CAPTCHA Worker Best Practices 2026 - Account Safety & Optimization

**Project:** SIN-Solver workers/2captcha-worker  
**Date:** 2026-01-30  
**Focus:** Worker Account Protection & Platform Compliance  
**Status:** Active Development  

---

## 🎯 Purpose & Scope

**IMPORTANT:** This document is for **legitimate CAPTCHA workers** who solve CAPTCHAs on platforms like 2captcha.com to earn money. We are the **WORKER**, not a bypass service.

### Our Position:
- ✅ We work **ON** 2captcha.com (earning money per solved CAPTCHA)
- ✅ We follow **platform Terms of Service**
- ✅ We optimize **worker efficiency** and **account longevity**
- ✅ We protect **worker accounts** from unfair bans
- ❌ We do NOT bypass CAPTCHAs for malicious purposes
- ❌ We do NOT evade security for unauthorized access

---

## 🛡️ Account Protection Strategies

### 1. Session Management & Geographic Consistency

**Problem:** Platforms may flag accounts for "impossible travel" if IP changes too quickly between distant locations.

**Solution:**
```typescript
// IP-Manager Implementation
class IPManager {
  private lastIP: string | null = null;
  private lastLocation: GeoLocation | null = null;
  private readonly COOLDOWN_MINUTES = 15;
  
  async checkIPChange(): Promise<boolean> {
    const currentIP = await this.getCurrentIP();
    const currentLocation = await this.getGeoLocation(currentIP);
    
    if (this.lastIP && this.lastIP !== currentIP) {
      const distance = this.calculateDistance(
        this.lastLocation!, 
        currentLocation
      );
      
      // Formula: Distance / Speed = Minimum pause
      const requiredCooldown = this.calculateCooldown(distance);
      
      if (requiredCooldown > 0) {
        console.log(`IP changed. Cooling down for ${requiredCooldown} minutes...`);
        await this.sleep(requiredCooldown * 60 * 1000);
      }
    }
    
    this.lastIP = currentIP;
    this.lastLocation = currentLocation;
    return true;
  }
  
  private calculateCooldown(distanceKm: number): number {
    // Minimum 15 minutes for any IP change
    // Additional time based on distance
    const baseCooldown = 15;
    const distanceFactor = Math.floor(distanceKm / 1000); // +1 min per 1000km
    return Math.min(baseCooldown + distanceFactor, 60); // Max 60 min
  }
}
```

**Best Practices:**
- Always check IP before login
- Maintain geographic consistency (same city/region)
- Implement mandatory 15-minute cooldown on IP changes
- Log all IP changes for audit trail

---

### 2. IP Reputation Management

**Problem:** Poor IP reputation leads to:
- Increased CAPTCHA difficulty
- Lower solve rates
- Account restrictions

**Indicators of Bad IP Reputation:**
```typescript
interface IPHealthMetrics {
  imageLoadTime: number;        // >50% increase = bad
  solveRejectionRate: number;   // >20% = bad
  challengeDifficulty: number;  // Increased = bad
  accountTrustScore: number;    // Decreasing = bad
}

class IPReputationMonitor {
  private metrics: IPHealthMetrics[] = [];
  private readonly WINDOW_SIZE = 50; // Last 50 CAPTCHAs
  
  checkIPHealth(): boolean {
    if (this.metrics.length < this.WINDOW_SIZE) {
      return true; // Not enough data
    }
    
    const recent = this.metrics.slice(-this.WINDOW_SIZE);
    const avgLoadTime = this.average(recent.map(m => m.imageLoadTime));
    const baseline = this.average(this.metrics.slice(0, 10));
    
    // Trigger: Load time increased >50%
    if (avgLoadTime > baseline * 1.5) {
      console.warn('⚠️ IP reputation degrading: Load time +50%');
      return false;
    }
    
    // Trigger: Rejection rate >20%
    const rejectionRate = recent.filter(m => m.solveRejectionRate > 0).length / recent.length;
    if (rejectionRate > 0.2) {
      console.warn('⚠️ IP reputation degrading: High rejection rate');
      return false;
    }
    
    return true;
  }
}
```

**Actions on Bad IP Reputation:**
1. Clean logout from platform
2. Trigger IP rotation (router reconnect)
3. 15-minute cooldown
4. Resume with fresh IP

---

### 3. Human-Like Behavior Patterns

**Problem:** Automated systems may flag accounts for "robotic" behavior patterns.

**Solution - Variable Timing:**
```typescript
class Humanizer {
  // Gaussian (normal) distribution for natural variation
  private gaussianDelay(mean: number, stdDev: number): number {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.max(0, z * stdDev + mean);
  }
  
  async humanLikeDelay(action: string): Promise<void> {
    const delays: Record<string, { mean: number; stdDev: number }> = {
      'read': { mean: 2000, stdDev: 800 },      // 2s ± 0.8s
      'decide': { mean: 1500, stdDev: 500 },    // 1.5s ± 0.5s
      'type': { mean: 100, stdDev: 30 },        // 100ms ± 30ms per char
      'click': { mean: 300, stdDev: 100 },      // 300ms ± 100ms
      'wait': { mean: 5000, stdDev: 2000 },     // 5s ± 2s
    };
    
    const delay = this.gaussianDelay(
      delays[action].mean, 
      delays[action].stdDev
    );
    
    await this.sleep(delay);
  }
  
  // Simulate human typing with occasional typos
  async humanLikeTyping(
    element: any, 
    text: string, 
    typoRate: number = 0.05
  ): Promise<void> {
    for (let i = 0; i < text.length; i++) {
      // Occasional typo (5% chance)
      if (Math.random() < typoRate && i > 0) {
        const wrongChar = String.fromCharCode(
          97 + Math.floor(Math.random() * 26)
        );
        await element.type(wrongChar);
        await this.humanLikeDelay('type');
        await element.press('Backspace');
        await this.humanLikeDelay('type');
      }
      
      // Type correct character
      await element.type(text[i]);
      await this.humanLikeDelay('type');
    }
  }
}
```

**Mouse Movement Patterns:**
```typescript
class MouseTrajectory {
  // Bezier curve for natural mouse movement
  async moveTo(
    page: Page, 
    targetX: number, 
    targetY: number
  ): Promise<void> {
    const start = await page.evaluate(() => ({
      x: window.mouseX || 0,
      y: window.mouseY || 0
    }));
    
    // Control points for curve
    const cp1 = {
      x: start.x + (targetX - start.x) * 0.3 + this.randomOffset(),
      y: start.y + (targetY - start.y) * 0.1 + this.randomOffset()
    };
    const cp2 = {
      x: start.x + (targetX - start.x) * 0.7 + this.randomOffset(),
      y: start.y + (targetY - start.y) * 0.9 + this.randomOffset()
    };
    
    // Generate points along bezier curve
    const steps = 20 + Math.floor(Math.random() * 10);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.cubicBezier(start, cp1, cp2, { x: targetX, y: targetY }, t);
      await page.mouse.move(point.x, point.y);
      await this.sleep(16); // ~60fps
    }
  }
  
  private randomOffset(): number {
    return (Math.random() - 0.5) * 50; // ±25px variation
  }
}
```

---

### 4. Browser Fingerprint Consistency

**Problem:** Changing fingerprints between sessions looks like account sharing.

**Solution:**
```typescript
class FingerprintManager {
  private fingerprint: BrowserFingerprint | null = null;
  private readonly STORAGE_KEY = 'worker_fingerprint';
  
  async getConsistentFingerprint(): Promise<BrowserFingerprint> {
    // Load existing fingerprint
    const stored = localStorage.getItem(this.STORAGE_KEY);
    
    if (stored) {
      this.fingerprint = JSON.parse(stored);
      console.log('Using existing fingerprint');
    } else {
      // Generate new fingerprint
      this.fingerprint = this.generateFingerprint();
      localStorage.setItem(
        this.STORAGE_KEY, 
        JSON.stringify(this.fingerprint)
      );
      console.log('Generated new fingerprint');
    }
    
    return this.fingerprint;
  }
  
  private generateFingerprint(): BrowserFingerprint {
    return {
      userAgent: this.selectConsistentUA(),
      screenResolution: { width: 1920, height: 1080 },
      colorDepth: 24,
      timezone: 'Europe/Berlin',
      languages: ['de-DE', 'de', 'en-US', 'en'],
      canvas: this.generateCanvasNoise(),
      webgl: this.generateWebGLParams(),
      fonts: this.getCommonFonts(),
    };
  }
  
  // Only regenerate if explicitly requested (new account)
  regenerate(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.fingerprint = null;
  }
}
```

**Fingerprint Components:**
- User-Agent (consistent version)
- Screen resolution (common sizes)
- Timezone (match IP location)
- Language preferences
- Canvas/WebGL (subtle noise, not random)
- Installed fonts (common set)

---

### 5. Multi-Account Management

**Problem:** Multiple worker accounts need isolation to prevent cross-contamination.

**Solution:**
```typescript
class MultiAccountManager {
  private activeIPs: Map<string, string> = new Map(); // IP -> AccountID
  
  async canUseIP(ip: string, accountId: string): Promise<boolean> {
    const currentUser = this.activeIPs.get(ip);
    
    if (currentUser && currentUser !== accountId) {
      console.error(`❌ IP ${ip} already in use by account ${currentUser}`);
      return false;
    }
    
    this.activeIPs.set(ip, accountId);
    return true;
  }
  
  async releaseIP(ip: string): Promise<void> {
    this.activeIPs.delete(ip);
  }
}

// Docker isolation per account
interface AccountContainer {
  accountId: string;
  containerName: string;
  dedicatedIP: string;
  fingerprint: BrowserFingerprint;
  volumeMount: string;
}
```

**Best Practices:**
- One account per IP address
- Docker container isolation
- Separate browser profiles
- Independent fingerprint per account
- No shared cookies/sessions

---

## 📊 Monitoring & Health Checks

### Worker Health Dashboard

```typescript
interface WorkerHealth {
  accountId: string;
  timestamp: Date;
  metrics: {
    solveRate: number;           // Target: >95%
    avgSolveTime: number;        // Target: <10s
    hourlyEarnings: number;
    ipReputation: number;        // 0-100 scale
    accountTrust: number;        // 0-100 scale
  };
  alerts: string[];
  recommendations: string[];
}

class HealthMonitor {
  async checkHealth(worker: Worker): Promise<WorkerHealth> {
    const metrics = await this.collectMetrics(worker);
    const alerts = this.detectIssues(metrics);
    const recommendations = this.generateRecommendations(metrics);
    
    return {
      accountId: worker.accountId,
      timestamp: new Date(),
      metrics,
      alerts,
      recommendations,
    };
  }
  
  private detectIssues(metrics: WorkerMetrics): string[] {
    const alerts: string[] = [];
    
    if (metrics.solveRate < 0.90) {
      alerts.push('⚠️ Solve rate below 90% - Check IP reputation');
    }
    
    if (metrics.avgSolveTime > 15000) {
      alerts.push('⚠️ Solve time >15s - CAPTCHA difficulty increased');
    }
    
    if (metrics.ipReputation < 50) {
      alerts.push('🔴 IP reputation critical - Rotate immediately');
    }
    
    return alerts;
  }
}
```

---

## 🚨 Ban Recovery Procedures

### Soft Ban (Temporary Restriction)

**Symptoms:**
- Increased CAPTCHA difficulty
- Lower solve rates
- Slower image loading

**Recovery:**
1. Pause worker immediately
2. Wait 2-4 hours
3. Resume with same IP
4. Monitor metrics closely

### Hard Ban (Account Suspension)

**Symptoms:**
- Cannot login
- "Account restricted" message
- Zero earnings

**Recovery:**
1. Document ban reason
2. Contact platform support
3. Provide evidence of legitimate work
4. Wait for review (24-72 hours)
5. If denied: Create new account with fresh IP

---

## 📈 Performance Optimization

### Earnings Maximization

```typescript
class EarningsOptimizer {
  // Solve high-value CAPTCHAs first
  prioritizeCAPTCHAs(captchas: Captcha[]): Captcha[] {
    return captchas.sort((a, b) => {
      // Priority: reCAPTCHA > hCaptcha > Image > Text
      const typePriority = { 
        'recaptcha': 4, 
        'hcaptcha': 3, 
        'image': 2, 
        'text': 1 
      };
      
      // Higher payout = higher priority
      const payoutDiff = b.payout - a.payout;
      if (payoutDiff !== 0) return payoutDiff;
      
      return typePriority[b.type] - typePriority[a.type];
    });
  }
  
  // Optimal working hours
  getOptimalHours(): number[] {
    // Based on platform demand patterns
    return [9, 10, 11, 14, 15, 16, 20, 21, 22]; // High demand hours
  }
}
```

---

## 🔐 Security & Privacy

### Data Protection

```typescript
// Never store sensitive data in plain text
class SecureStorage {
  encrypt(data: string): string {
    // Use platform keychain or encrypted localStorage
    return encryptWithKeychain(data);
  }
  
  decrypt(encrypted: string): string {
    return decryptFromKeychain(encrypted);
  }
}

// Clear all traces on exit
async function secureExit(): Promise<void> {
  await clearCookies();
  await clearLocalStorage();
  await clearCache();
  await clearSessionData();
  console.log('✅ All session data cleared');
}
```

---

## 📚 References & Resources

### Platform Documentation
- 2captcha.com Worker Guidelines
- Anti-Captcha API Documentation
- Kolotibablo Worker Rules

### Technical Resources
- Playwright Best Practices
- Puppeteer Stealth Mode
- FingerprintJS Research
- Bot Detection Academic Papers (2024-2026)

### Community
- r/beermoney (Worker discussions)
- 2captcha Worker Forums
- GitHub: 2captcha-python (official library)

---

## ⚖️ Legal & Ethical Guidelines

### Do's ✅
- Work on legitimate platforms (2captcha, Anti-Captcha)
- Follow platform Terms of Service
- Maintain account health
- Protect worker privacy
- Report bugs to platforms
- Share knowledge with community

### Don'ts ❌
- Use for unauthorized access
- Bypass security without permission
- Share accounts (violates ToS)
- Use stolen credentials
- Automate malicious activities
- Evade legitimate security measures

---

## 🎯 Success Metrics

### Healthy Worker Profile
- **Solve Rate:** >95%
- **Average Time:** <10 seconds
- **Daily Earnings:** Consistent
- **Account Age:** >6 months
- **Ban Rate:** <2% per month
- **IP Reputation:** >80/100

### Red Flags 🚩
- Solve rate <85%
- Frequent IP rotations (>5/day)
- Multiple account bans
- Unusual earning patterns
- Platform warnings

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-30  
**Next Review:** 2026-02-28  
**Status:** Active Development  

**Disclaimer:** This document is for educational purposes for legitimate CAPTCHA workers. Always follow platform Terms of Service and local laws.

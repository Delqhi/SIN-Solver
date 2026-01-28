# SIN-Solver: CAPTCHA & Deception Pattern Recognition System

## 🎯 Overview

SIN-Solver is a sophisticated system for detecting and preventing interaction-based attacks including:
- CAPTCHA challenges
- Honeypot traps
- Phishing attempts
- Fake elements (hidden buttons, opacity 0, etc.)

## 🏗️ Architecture

### Components

1. **StateMachine**: Core state management
2. **DeceptionHunter**: Pattern recognition & verification
3. **Honeypot**: Spatial safety verification
4. **InteractionAPI**: Unified interface
5. **AuditLogger**: Full traceability

### Data Flow

```
User Click
  ↓
InteractionAPI.click(target)
  ↓
Capture State BEFORE
  ↓
Execute Click
  ↓
Capture State AFTER
  ↓
DeceptionHunter.verify() [Pattern Detection]
  ↓
Honeypot.verify() [Spatial Safety]
  ↓
Calculate Confidence Score
  ↓
AuditLogger.log() [Record Everything]
  ↓
Return IInteractionResult
```

## 🔧 Usage

### Basic Example

```typescript
import { StateMachine } from './state-machine';
import { DeceptionHunter } from './deception-hunter';
import { Honeypot } from './honeypot';
import { InteractionAPI } from './interaction-api';
import { AuditLogger } from './audit';

// Initialize components
const sm = new StateMachine(config);
const dh = new DeceptionHunter(sm);
const hp = new Honeypot();
const logger = new AuditLogger();

// Create API
const api = new InteractionAPI({ sm, dh, hp });

// Click & Verify
const result = await api.click('submit-button', 100, 200);
console.log(result.confidence); // 0-100
console.log(result.audit_log);
```

## 📊 Confidence Scoring

Score combines:
- Pattern detection (0-50 points)
- Spatial verification (0-30 points)
- State change analysis (0-20 points)

**Result: 0-100**

## 🚨 Error Codes

- **E001**: Invalid state transition
- **E002**: Click verification failed
- **E003**: Honeypot false click detected
- **E004**: Deception pattern matched

## 🧪 Testing

```bash
npm test                    # Run all tests
npm test -- --coverage      # Coverage report
npm test -- sin-solver.test # Specific file
```

## 📝 API Reference

### StateMachine.transition(to, metadata)
Transitions to new state if legal.

### DeceptionHunter.analyze(content)
Analyzes content for deception patterns.

### Honeypot.blockFalseClick(x, y)
Verifies click is in safe zone.

### InteractionAPI.click(target, x, y, options)
Executes full click cycle with verification.

### AuditLogger.export()
Exports all logs as JSON.

---

**Version:** 1.0.0  
**Status:** Production Ready

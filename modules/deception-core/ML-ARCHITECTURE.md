# 🤖 Delqhi-Platform v2.0: ML-Based Deception Detection Architecture

**Status:** Planning Phase  
**Estimated Duration:** 4-5 hours  
**Target Version:** 2.0.0  
**Date Started:** 2026-01-26

---

## 📋 Executive Summary

Wir transformieren Delqhi-Platform von einem **Regex-basierten System** zu einem **hybriden ML + Regex Ensemble** für höhere Genauigkeit bei Deception-Detection.

### Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT: Page Content, User Interaction Data                 │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴─────────────────────┐
    │                                  │
    ▼                                  ▼
┌──────────────┐              ┌──────────────────┐
│ REGEX ENGINE │              │  ML MODELS       │
│ (v1.0)       │              │ - CNN (visual)   │
│ Fast         │              │ - LSTM (sequence)│
│ Deterministic│              │ - Dense (generic)│
└──────────────┘              └──────────────────┘
    │                                  │
    │           ENSEMBLE               │
    │     ┌──────────────────┐         │
    └────→│ Weighted Voting  │←────────┘
          │ - Regex: 40%     │
          │ - ML: 60%        │
          │ Final Score: 0-1 │
          └─────────┬────────┘
                    │
                    ▼
          ┌──────────────────┐
          │ DECISION TREE    │
          │ Confidence → Risk│
          │ 0.0-0.3: Green   │
          │ 0.3-0.7: Yellow  │
          │ 0.7-1.0: Red     │
          └──────────────────┘
                    │
                    ▼
            RETURN VERDICT + CONFIDENCE
```

---

## 🔧 Implementation Phases (Detailed)

### Phase 1: Analyse & Planning ⏱️ 30 Minuten

**Was zu tun ist:**
- Analysiere aktuelle `DeceptionHunter` Klasse
- Entwirf ML-Model Interface
- Plane Training-Daten-Struktur
- Definiere Hybrid-Integration

**Deliverables:**
- `ml-architecture.md` - Detailed Technical Spec
- `models/` directory structure
- Training data schema

---

### Phase 2: TensorFlow.js Setup ⏱️ 1 Stunde

**Dependencies zu installieren:**
```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-node
npm install @tensorflow/tfjs-core @tensorflow/tfjs-layers
npm install tf-idf-cosine  # für Text-Vectorization
npm install natural       # NLP utilities
```

**Was zu erstellen ist:**
```typescript
// ml/model-loader.ts
- loadCNNModel()      // Visual pattern detection
- loadLSTMModel()     // Sequence analysis
- loadEnsembleModel() // Meta-learner

// ml/training-data.ts
- TrainingDataset interface
- DataLoader für JSONL/CSV
- Data normalization functions

// ml/preprocessor.ts
- HTML content → Vector representation
- Text embedding
- Feature extraction
```

---

### Phase 3: ML Models Implementierung ⏱️ 1.5 Stunden

**CNN Model für Visual Patterns:**
```
Input: HTML Content Vector (256 dims)
├─ Conv1D (128 filters, kernel=3)
├─ MaxPooling (2)
├─ Conv1D (64 filters, kernel=3)
├─ GlobalAveragePooling
├─ Dense (32)
└─ Output: Prediction (0-1)
```

**LSTM Model für Sequence Analysis:**
```
Input: Sequence of Interactions (100 steps)
├─ LSTM (64 units)
├─ Dropout (0.2)
├─ LSTM (32 units)
├─ GlobalAveragePooling
├─ Dense (16)
└─ Output: Prediction (0-1)
```

**Ensemble Meta-Learner:**
```
Inputs: [CNN_pred, LSTM_pred, Regex_score]
├─ Dense (16) + ReLU
├─ Dropout (0.3)
├─ Dense (8) + ReLU
└─ Output: Final Probability (0-1)
```

---

### Phase 4: Hybrid Integration ⏱️ 1 Stunde

**Neue DeceptionHunter Methode:**

```typescript
class DeceptionHunter {
  private mlModels: MLModelEnsemble;
  
  async analyzeWithML(
    page_content: string,
    interaction_history: IInteractionRecord[]
  ): Promise<{
    regex_score: number;      // 0-100
    ml_score: number;         // 0-100 (ensemble)
    final_score: number;      // weighted average
    confidence: number;       // 0-1
    verdict: 'SAFE' | 'SUSPICIOUS' | 'THREAT';
    metadata: {
      cnn_score: number;
      lstm_score: number;
      matched_patterns: string[];
    }
  }>;
}
```

**Integration in InteractionAPI:**

```typescript
// Click verification flow wird erweitert
const result = await api.click(target, x, y);
// Jetzt mit ML-Analyse!
```

---

### Phase 5: Training & Model Files ⏱️ 1 Stunde

**Pre-trained Models:**
```
models/
├── cnn-model.json       (Weights)
├── cnn-model.weights.bin
├── lstm-model.json
├── lstm-model.weights.bin
├── ensemble-model.json
├── ensemble-model.weights.bin
└── training-metadata.json
```

**Training Data (Open Source)**
- OWASP CWE-1021 (Improper Restriction of Rendered UI Layers)
- Public datasets für CAPTCHA detection
- Phishing detection datasets (PhiUSIL, etc.)

---

### Phase 6: Testing Strategy ⏱️ 1.5 Stunden

**Unit Tests für ML:**
```typescript
// __tests__/ml-models.test.ts
describe('ML Models', () => {
  describe('CNNModel', () => {
    it('should detect CAPTCHA patterns with CNN');
    it('should handle batch predictions');
    it('should return confidence scores 0-1');
  });
  
  describe('LSTMModel', () => {
    it('should analyze interaction sequences');
    it('should detect rapid-click patterns');
  });
  
  describe('Ensemble', () => {
    it('should weight predictions correctly');
    it('should handle model failures gracefully');
  });
});

// Integration Tests
describe('Hybrid Mode', () => {
  it('should combine Regex + ML predictions');
  it('should fall back to Regex if ML unavailable');
  it('should maintain backward compatibility');
});
```

---

### Phase 7: Performance & Optimization ⏱️ 1 Stunde

**Optimizations:**
```typescript
// Model Quantization
- Convert FP32 → INT8 (3-4x faster, minimal loss)
- Use @tensorflow/tfjs-layers for optimized inference

// Batch Processing
- Cache model predictions for identical inputs
- Use Promise.all() für parallel predictions

// Memory Management
- Stream large payloads
- Garbage collection zwischen predictions
- Model weights als shared memory
```

**Benchmarks:**
```
Current (Regex only):     ~2-3ms per click
Target (ML enabled):     ~15-20ms per click
With optimization:       ~5-10ms per click
```

---

## 📊 Hybrid Scoring Algorithm

```
FINAL_SCORE = (REGEX_SCORE × 0.40) + (ML_SCORE × 0.60)

Where:
  REGEX_SCORE = 0-100 (current system)
  ML_SCORE = Ensemble output (0-100)
  
Confidence Buckets:
  0.0-0.2:  🟢 SAFE       (Allow interaction)
  0.2-0.4:  🟡 LOW_RISK   (Monitor)
  0.4-0.7:  🟠 MEDIUM     (Warn user)
  0.7-1.0:  🔴 HIGH_THREAT (Block)
```

---

## 🎯 API Changes (Backward Compatible)

```typescript
// v1.0 - Still works!
const result = await api.click(target, x, y);

// v2.0 - New ML features
const result = await api.click(target, x, y, {
  enable_ml: true,           // Enable ML analysis
  ml_confidence_threshold: 0.7,
  use_hybrid_scoring: true   // Default: true
});

// Result now includes ML predictions
result.ml_metadata = {
  cnn_score: 0.85,
  lstm_score: 0.72,
  ensemble_score: 0.78,
  verdict: 'SUSPICIOUS'
};
```

---

## 📦 New Files to Create

```
Delqhi-Platform/
├── ml/
│   ├── model-loader.ts          (Model management)
│   ├── preprocessor.ts          (Data preprocessing)
│   ├── cnn-model.ts            (CNN architecture)
│   ├── lstm-model.ts           (LSTM architecture)
│   ├── ensemble.ts             (Meta-learner)
│   ├── training-data-schema.ts (Training data types)
│   └── config.ts               (ML configuration)
│
├── models/
│   ├── cnn/
│   │   ├── model.json
│   │   └── weights.bin
│   ├── lstm/
│   │   ├── model.json
│   │   └── weights.bin
│   └── ensemble/
│       ├── model.json
│       └── weights.bin
│
├── __tests__/
│   ├── ml-models.test.ts       (ML unit tests)
│   └── hybrid-integration.test.ts (Integration tests)
│
├── ml-config.json              (Model paths & params)
└── ML-ARCHITECTURE.md          (Technical documentation)
```

---

## ⚡ Quick Win Strategy

**Falls 5 hours zu wenig ist:**

### Minimal Viable v2.0 (2.5 hours)
1. ✅ Phase 1-2: Setup & TensorFlow.js
2. ✅ Phase 3: Simple Dense Network (statt CNN/LSTM)
3. ✅ Phase 4: Basic Hybrid Integration
4. ✅ Phase 5: Essential Tests
5. ⏸️ Phase 6-7: Optimization für v2.1

### Full v2.0 (5 hours) - Current Plan
Alle Phases mit CNN + LSTM + Ensemble

---

## 🚀 Success Criteria

- ✅ ML Models laden und Predictions machen
- ✅ Hybrid Scoring funktioniert
- ✅ Backward compatibility erhalten (v1.0 API still works)
- ✅ Tests für ML-Komponenten (80%+ coverage)
- ✅ Performance < 20ms per prediction
- ✅ Documentation für neue API
- ✅ v2.0.0 Git tag + Release notes

---

## 📚 References

**TensorFlow.js Docs:**
- https://js.tensorflow.org/api/latest/
- CNN: https://js.tensorflow.org/tutorials/getting-started
- LSTM: https://github.com/tensorflow/tfjs-models

**CAPTCHA/Phishing Detection Papers:**
- "End-to-end CAPTCHA Detection" - CVPR 2020
- "Deep Learning for Phishing Detection" - IEEE 2021

**Open Datasets:**
- OWASP CWE-1021
- PhiUSIL (Phishing URLs)
- reCAPTCHA Challenges (Public)

---

## 🎓 Architecture Decision Records (ADRs)

### ADR-1: Why TensorFlow.js?
- ✅ Browser & Node.js compatible
- ✅ Pre-trained models available
- ✅ Good ecosystem for NLP/Vision
- ✅ Active community & documentation

### ADR-2: Why Ensemble?
- ✅ Better generalization
- ✅ Robustness to input variations
- ✅ Can handle model failure gracefully
- ✅ Interpretable (weighted voting)

### ADR-3: Hybrid Approach?
- ✅ Keep fast Regex as fallback
- ✅ ML adds accuracy but slower
- ✅ Weighted combination best of both worlds

---

**Ready to implement?** Let's start with Phase 1-2! 🚀

---

*Generated: 2026-01-26 23:40*  
*ML Vision: Transformer Delqhi-Platform von Rule-Based zu Intelligence-Driven*

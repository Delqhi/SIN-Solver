#!/usr/bin/env node

/**
 * Consensus Solver Server
 * Exposes consensus voting system via Express API
 * Listens on http://localhost:8090
 */

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Configuration
const CONFIG = {
  port: process.env.CONSENSUS_PORT || 8090,
  agents: {
    'agent-03': process.env.AGENT_03_URL || 'http://localhost:8003',
    'agent-06': process.env.AGENT_06_URL || 'http://localhost:8006',
    'agent-07': process.env.AGENT_07_URL || 'http://localhost:8007'
  },
  timeout: 15000,
  minConfidence: 0.95
};

// Consensus Solver Class
class ConsensusSolver {
  constructor(agents, timeout = 15000) {
    this.agents = agents;
    this.timeout = timeout;
    this.stats = {
      requests: 0,
      solved: 0,
      failed: 0,
      avgConfidence: 0,
      totalConfidence: 0
    };
  }

  async solve(imageBase64, minConfidence = 0.95) {
    this.stats.requests++;

    // Query all agents in parallel
    const promises = Object.entries(this.agents).map(([name, url]) =>
      this.queryAgent(name, url, imageBase64)
    );

    const results = await Promise.allSettled(promises);
    const votes = {};
    const confidences = [];

    // Collect votes from successful agents
    results.forEach((result, i) => {
      const agent = Object.keys(this.agents)[i];
      if (result.status === 'fulfilled' && result.value) {
        const { solution, confidence } = result.value;
        votes[solution] = (votes[solution] || 0) + 1;
        confidences.push(confidence);
      }
    });

    // Find consensus solution
    const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    
    if (sortedVotes.length === 0) {
      this.stats.failed++;
      return { error: 'No agents could solve the captcha', solution: null, confidence: 0, agreement: 0 };
    }

    const [solution, agreement] = sortedVotes[0];
    const avgConfidence = confidences.length > 0 
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
      : 0;

    if (avgConfidence >= minConfidence && agreement >= 2) {
      this.stats.solved++;
      this.stats.totalConfidence += avgConfidence;
    } else {
      this.stats.failed++;
    }

    return {
      solution: avgConfidence >= minConfidence && agreement >= 2 ? solution : null,
      confidence: avgConfidence,
      agreement: agreement,
      votes: votes,
      minConfidence: minConfidence,
      required: `${agreement} agents agree @ ${(avgConfidence * 100).toFixed(1)}% confidence`
    };
  }

  async queryAgent(name, url, imageBase64, timeout = this.timeout) {
    try {
      const response = await axios.post(
        `${url}/api/solve-captcha`,
        { image: imageBase64, timeout },
        { timeout }
      );

      return {
        agent: name,
        solution: response.data.solution,
        confidence: response.data.confidence || 0.8
      };
    } catch (error) {
      console.log(`Agent ${name} (${url}) failed:`, error.message);
      return null;
    }
  }

  getStats() {
    return {
      ...this.stats,
      avgConfidence: this.stats.solved > 0 
        ? (this.stats.totalConfidence / this.stats.solved).toFixed(3)
        : 0,
      successRate: this.stats.requests > 0
        ? ((this.stats.solved / this.stats.requests) * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

// Initialize solver
const solver = new ConsensusSolver(CONFIG.agents, CONFIG.timeout);

// Routes
app.post('/api/consensus-solve', async (req, res) => {
  try {
    const { image, minConfidence = CONFIG.minConfidence } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Missing image parameter' });
    }

    const result = await solver.solve(image, minConfidence);
    res.json(result);
  } catch (error) {
    console.error('Error in consensus-solve:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/consensus-solve', (req, res) => {
  res.json({
    service: 'Consensus Solver',
    version: '1.0.0',
    agents: CONFIG.agents,
    timeout: CONFIG.timeout,
    minConfidence: CONFIG.minConfidence
  });
});

app.get('/api/stats', (req, res) => {
  res.json(solver.getStats());
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'consensus-solver',
    uptime: process.uptime(),
    stats: solver.getStats()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(CONFIG.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          CONSENSUS SOLVER SERVER STARTED                   ║
╚════════════════════════════════════════════════════════════╝

🚀 Server: http://localhost:${CONFIG.port}
📊 Health: http://localhost:${CONFIG.port}/api/health
📈 Stats:  http://localhost:${CONFIG.port}/api/stats
🎯 Solve:  POST http://localhost:${CONFIG.port}/api/consensus-solve

Agents:
${Object.entries(CONFIG.agents).map(([name, url]) => `  • ${name}: ${url}`).join('\n')}

Ready to accept captcha solving requests!
  `);
});

process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  console.log('Final Statistics:', solver.getStats());
  process.exit(0);
});

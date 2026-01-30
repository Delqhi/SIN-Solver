/**
 * Consensus Solver Module
 * 3-agent voting system for high-confidence captcha solving
 * 
 * Endpoint: POST http://localhost:8090/api/consensus-solve
 * 
 * Request:
 * {
 *   "image": "base64_encoded_image",
 *   "timeout": 15000,
 *   "agents": ["agent-03", "agent-06", "agent-07"],
 *   "thresholdConfidence": 0.95
 * }
 * 
 * Response:
 * {
 *   "solution": "ABC123",
 *   "confidence": 0.97,
 *   "agreement": 3,
 *   "votes": {...}
 * }
 */

const axios = require('axios');

class ConsensusSolver {
  constructor(agentEndpoints = {}) {
    this.agentEndpoints = agentEndpoints || {
      'agent-03': 'http://agent-03-agentzero:8000',
      'agent-06': 'http://agent-06-skyvern:8000',
      'agent-07': 'http://agent-07-stagehand:3000'
    };
    this.timeout = 15000;
  }

  /**
   * Query all agents in parallel for captcha solution
   */
  async querySolvers(imageBase64, timeout = this.timeout) {
    const agentPromises = Object.entries(this.agentEndpoints).map(([name, endpoint]) =>
      this.querySingleAgent(name, endpoint, imageBase64, timeout)
    );

    const results = await Promise.allSettled(agentPromises);
    return results.map((r, i) => ({
      agent: Object.keys(this.agentEndpoints)[i],
      ...r.value
    }));
  }

  /**
   * Query single agent with timeout
   */
  async querySingleAgent(agentName, endpoint, imageBase64, timeout) {
    try {
      const response = await axios.post(
        `${endpoint}/solve/captcha`,
        { image: imageBase64 },
        { timeout }
      );

      return {
        solution: response.data.solution || '',
        confidence: response.data.confidence || 0.5,
        time: response.data.time || 0
      };
    } catch (error) {
      console.error(`Agent ${agentName} failed:`, error.message);
      return {
        solution: '',
        confidence: 0,
        error: error.message,
        time: timeout
      };
    }
  }

  /**
   * Calculate consensus from multiple agent responses
   */
  calculateConsensus(votes, thresholdConfidence = 0.95) {
    // Filter valid votes
    const validVotes = votes.filter(v => v.solution && v.confidence > 0);

    if (validVotes.length === 0) {
      return {
        solution: '',
        confidence: 0,
        agreement: 0,
        reason: 'No valid votes received'
      };
    }

    // Group by solution
    const solutionGroups = {};
    validVotes.forEach(vote => {
      if (!solutionGroups[vote.solution]) {
        solutionGroups[vote.solution] = [];
      }
      solutionGroups[vote.solution].push(vote);
    });

    // Find solution with most votes
    let bestSolution = '';
    let maxVotes = 0;
    let bestConfidences = [];

    for (const [solution, group] of Object.entries(solutionGroups)) {
      if (group.length > maxVotes) {
        maxVotes = group.length;
        bestSolution = solution;
        bestConfidences = group.map(v => v.confidence);
      }
    }

    // Calculate average confidence for best solution
    const avgConfidence = bestConfidences.reduce((a, b) => a + b, 0) / bestConfidences.length;
    const agreement = maxVotes;
    const totalVotes = validVotes.length;

    return {
      solution: bestSolution,
      confidence: Math.min(avgConfidence, agreement / totalVotes),
      agreement,
      totalVotes,
      solutionVotes: solutionGroups[bestSolution] || [],
      meetsThreshold: avgConfidence >= thresholdConfidence,
      reason: avgConfidence >= thresholdConfidence ? 'Consensus met' : `Confidence ${avgConfidence.toFixed(2)} below ${thresholdConfidence}`
    };
  }

  /**
   * Main solve method: query all agents and calculate consensus
   */
  async solve(imageBase64, options = {}) {
    const {
      timeout = this.timeout,
      thresholdConfidence = 0.95,
      agents = Object.keys(this.agentEndpoints)
    } = options;

    const startTime = Date.now();

    // Query agents
    const votes = await this.querySolvers(imageBase64, timeout);

    // Calculate consensus
    const consensus = this.calculateConsensus(votes, thresholdConfidence);

    return {
      ...consensus,
      votes: votes.map(v => ({
        agent: v.agent,
        solution: v.solution,
        confidence: v.confidence,
        time: v.time,
        error: v.error
      })),
      totalTime: Date.now() - startTime
    };
  }
}

module.exports = ConsensusSolver;

// Express server implementation
if (require.main === module) {
  const express = require('express');
  const app = express();
  app.use(express.json());

  const solver = new ConsensusSolver();

  app.post('/api/consensus-solve', async (req, res) => {
    try {
      const { image, timeout = 15000, thresholdConfidence = 0.95 } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Image required' });
      }

      const result = await solver.solve(image, {
        timeout,
        thresholdConfidence
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(8090, () => console.log('Consensus solver running on :8090'));
}

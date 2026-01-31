/**
 * Multi-Agent CAPTCHA Solver - Usage Examples
 * 
 * This file demonstrates how to use the multi-agent CAPTCHA solver
 * in different scenarios.
 */

import {
  MultiAgentSolver,
  createDefaultMultiAgentSolver,
  ICapatchaSolver,
  SolverResult,
} from './index';
import fs from 'fs';
import path from 'path';

/**
 * Example 1: Using Default Configuration
 * Create a pre-configured solver with all 3 agents
 */
async function example1_DefaultConfiguration() {
  console.log('\n=== Example 1: Default Multi-Agent Configuration ===\n');

  try {
    // Create solver with default agents
    const solver = await createDefaultMultiAgentSolver({
      timeout: 30000, // 30 seconds per agent
      minConfidence: 0.7, // Accept solutions with 70%+ confidence
    });

    console.log('✓ Solver initialized');
    console.log(`  Agents: ${solver.getSolverNames().join(', ')}`);
    console.log(`  Config:`, solver.getConfig());

    // In real usage, load actual CAPTCHA image
    const dummyImage = Buffer.from('placeholder-captcha-data');

    // Note: This will fail with dummy data, but shows the structure
    console.log('\n  Attempting to solve CAPTCHA...');
    try {
      const result = await solver.solve(dummyImage);
      console.log('✓ CAPTCHA solved!');
      console.log(`  Best answer: "${result.bestResult.answer}"`);
      console.log(`  Confidence: ${(result.bestResult.confidence * 100).toFixed(1)}%`);
      console.log(`  Model used: ${result.bestResult.model}`);
      console.log(`  Total time: ${result.totalTime}ms`);

      if (result.consensus) {
        console.log(`  Consensus detected: "${result.consensus.answer}" (${result.consensus.agentCount} agents agreed)`);
      }
    } catch (error) {
      console.log('✗ Solver error (expected with dummy image):', (error as Error).message);
    }
  } catch (error) {
    console.error('✗ Failed to initialize solver:', (error as Error).message);
  }
}

/**
 * Example 2: Custom Solver Configuration
 * Create solver with specific agents only
 */
async function example2_CustomConfiguration() {
  console.log('\n=== Example 2: Custom Solver Configuration ===\n');

  try {
    const { createSkyvernSolver, createVisionModelSolver } = await import('./index');

    // Use only Skyvern and Vision Model (no ddddocr)
    const solvers: ICapatchaSolver[] = [
      createSkyvernSolver(),
      createVisionModelSolver(),
    ];

    const solver = new MultiAgentSolver(solvers, {
      timeout: 20000,
      minConfidence: 0.75,
      parallel: true,
    });

    console.log('✓ Custom solver created');
    console.log(`  Agents: ${solver.getSolverNames().join(', ')}`);
    console.log(`  Timeout: ${solver.getConfig().timeout}ms`);
    console.log(`  Min Confidence: ${solver.getConfig().minConfidence}`);
  } catch (error) {
    console.error('✗ Error:', (error as Error).message);
  }
}

/**
 * Example 3: Load and Process Real CAPTCHA Image
 */
async function example3_RealImage(imagePath: string) {
  console.log(`\n=== Example 3: Processing Real Image (${imagePath}) ===\n`);

  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠ File not found: ${imagePath}`);
      console.log('  This example requires a real CAPTCHA image file');
      return;
    }

    // Load image from disk
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`✓ Loaded image: ${imageBuffer.length} bytes`);

    // Create solver
    const solver = await createDefaultMultiAgentSolver();

    // Solve CAPTCHA
    console.log('\n  Solving CAPTCHA...');
    const startTime = Date.now();
    const result = await solver.solve(imageBuffer);
    const processingTime = Date.now() - startTime;

    // Display results
    console.log(`\n✓ CAPTCHA solved in ${processingTime}ms!\n`);
    console.log('Results Summary:');
    console.log('═'.repeat(50));

    // Best result
    console.log(`\nBest Solution:`);
    console.log(`  Answer:     "${result.bestResult.answer}"`);
    console.log(`  Confidence: ${(result.bestResult.confidence * 100).toFixed(1)}%`);
    console.log(`  Model:      ${result.bestResult.model}`);
    console.log(`  Time:       ${result.bestResult.time}ms`);

    // All results
    console.log(`\nAll Results (${result.results.length} agents):`);
    result.results.forEach((res, idx) => {
      const status = res.error ? '✗' : '✓';
      console.log(`  ${status} ${res.model}:`);
      console.log(`     Answer: "${res.answer}"`);
      console.log(`     Confidence: ${(res.confidence * 100).toFixed(1)}%`);
      if (res.error) {
        console.log(`     Error: ${res.error}`);
      }
    });

    // Consensus
    if (result.consensus) {
      console.log(`\nConsensus Detected:`);
      console.log(`  Answer: "${result.consensus.answer}"`);
      console.log(`  Agents: ${result.consensus.agentCount}`);
      console.log(`  Avg Confidence: ${(result.consensus.confidence * 100).toFixed(1)}%`);
    } else {
      console.log(`\nNo consensus (all agents disagree)`);
    }

    // Performance
    console.log(`\nPerformance:`);
    console.log(`  Total Time: ${result.totalTime}ms`);
    console.log(`  Valid Results: ${result.validResults.length}/${result.results.length}`);

  } catch (error) {
    console.error('✗ Error:', (error as Error).message);
  }
}

/**
 * Example 4: Error Handling
 */
async function example4_ErrorHandling() {
  console.log('\n=== Example 4: Error Handling ===\n');

  try {
    const solver = await createDefaultMultiAgentSolver({
      minConfidence: 0.95, // Very high threshold
      timeout: 5000, // Short timeout
    });

    console.log('Testing various error conditions...\n');

    // Test 1: Empty buffer
    console.log('Test 1: Empty CAPTCHA buffer');
    try {
      await solver.solve(Buffer.from(''));
    } catch (error) {
      console.log(`  ✓ Caught error: ${(error as Error).message}\n`);
    }

    // Test 2: Very low quality image (simulated)
    console.log('Test 2: Low confidence threshold (0.95)');
    console.log('  (Would reject all but perfect results)\n');

    // Test 3: Timeout demonstration
    console.log('Test 3: Short timeout (5000ms)');
    console.log('  (Would timeout on slow solvers)\n');

  } catch (error) {
    console.error('✗ Error:', (error as Error).message);
  }
}

/**
 * Example 5: Performance Benchmarking
 */
async function example5_Benchmarking() {
  console.log('\n=== Example 5: Performance Benchmarking ===\n');

  try {
    const solver = await createDefaultMultiAgentSolver();
    const dummy = Buffer.from('test-image');

    console.log('Running 5 benchmark iterations...\n');

    const times: number[] = [];

    for (let i = 1; i <= 5; i++) {
      try {
        const start = Date.now();
        const result = await solver.solve(dummy);
        const elapsed = Date.now() - start;
        times.push(elapsed);

        console.log(`  Iteration ${i}: ${elapsed}ms`);
      } catch (error) {
        console.log(`  Iteration ${i}: Error - ${(error as Error).message}`);
      }
    }

    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      console.log(`\nBenchmark Results:`);
      console.log(`  Average: ${avg.toFixed(0)}ms`);
      console.log(`  Min:     ${min}ms`);
      console.log(`  Max:     ${max}ms`);
    }
  } catch (error) {
    console.error('✗ Error:', (error as Error).message);
  }
}

/**
 * Example 6: Consensus-Aware Decision Making
 */
async function example6_ConsensusDecisionMaking() {
  console.log('\n=== Example 6: Consensus-Aware Decision Making ===\n');

  console.log('Strategy: Use consensus result when available, fallback to best result\n');

  try {
    // This example shows how to use consensus information
    // In a real scenario, you might:
    // - Accept consensus with lower confidence threshold
    // - Reject non-consensus results even if high confidence
    // - Log warnings for non-consensus high-confidence results
    // - Require manual review for conflicting results

    const solver = await createDefaultMultiAgentSolver();
    const dummyImage = Buffer.from('test');

    try {
      const result = await solver.solve(dummyImage);

      let finalAnswer: string;
      let decisionReason: string;

      if (result.consensus) {
        finalAnswer = result.consensus.answer;
        decisionReason = `Consensus from ${result.consensus.agentCount} agents`;
      } else {
        finalAnswer = result.bestResult.answer;
        decisionReason = `Best result (${(result.bestResult.confidence * 100).toFixed(0)}% confidence)`;
      }

      console.log(`✓ Final Decision: "${finalAnswer}"`);
      console.log(`  Reason: ${decisionReason}`);
    } catch (error) {
      console.log(`(Would handle real image, got error with dummy: ${(error as Error).message})`);
    }
  } catch (error) {
    console.error('✗ Error:', (error as Error).message);
  }
}

/**
 * Main - Run all examples
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Multi-Agent CAPTCHA Solver - Usage Examples           ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // Run examples
    await example1_DefaultConfiguration();
    await example2_CustomConfiguration();

    // Check for sample image
    const sampleImagePath = path.join(__dirname, '../../samples/sample-captcha.png');
    await example3_RealImage(sampleImagePath);

    await example4_ErrorHandling();
    // await example5_Benchmarking(); // Commented out as it takes time
    await example6_ConsensusDecisionMaking();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Examples Complete                                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ Fatal error:', (error as Error).message);
    process.exit(1);
  }
}

// Run examples
if (require.main === module) {
  main().catch((error) => {
    console.error('✗ Unhandled error:', error);
    process.exit(1);
  });
}

export {
  example1_DefaultConfiguration,
  example2_CustomConfiguration,
  example3_RealImage,
  example4_ErrorHandling,
  example5_Benchmarking,
  example6_ConsensusDecisionMaking,
};

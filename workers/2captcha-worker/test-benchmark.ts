#!/usr/bin/env node
/**
 * Run Browserless Performance Benchmark
 */

import { BrowserlessBenchmark } from './src/browserless-benchmark';

async function runBenchmark() {
  const benchmark = new BrowserlessBenchmark();
  await benchmark.runBenchmarks();
}

runBenchmark().catch(console.error);

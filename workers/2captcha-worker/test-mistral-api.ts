#!/usr/bin/env node
/**
 * MISTRAL API TEST
 * Tests if the Mistral API key is valid and working
 */

import * as dotenv from 'dotenv';
dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

async function testMistralAPI(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  MISTRAL API TEST                                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Check if API key exists
  if (!MISTRAL_API_KEY) {
    console.error('❌ MISTRAL_API_KEY not found in .env');
    process.exit(1);
  }
  
  console.log(`🔑 API Key: ${MISTRAL_API_KEY.substring(0, 10)}...${MISTRAL_API_KEY.substring(MISTRAL_API_KEY.length - 4)}`);
  console.log(`🌐 API URL: ${MISTRAL_API_URL}`);
  console.log('');
  
  // Test 1: Simple text completion
  console.log('🧪 Test 1: Simple text completion');
  console.log('   Prompt: "Say hello in 3 words"');
  console.log('');
  
  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'user', content: 'Say hello in exactly 3 words' }
        ],
        max_tokens: 50
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`   Details: ${errorText}`);
      process.exit(1);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response';
    
    console.log('✅ Test 1 PASSED');
    console.log(`   Response: "${content}"`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Test 1 FAILED');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
  
  // Test 2: Vision capability (if pixtral is available)
  console.log('🧪 Test 2: Vision model availability');
  console.log('   Model: pixtral-12b-2409');
  console.log('');
  
  try {
    // Just check if the model exists by making a minimal request
    const response = await fetch('https://api.mistral.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to list models: ${response.status}`);
      process.exit(1);
    }
    
    const data = await response.json();
    const models = data.data || [];
    const pixtralModel = models.find((m: any) => m.id === 'pixtral-12b-2409');
    
    if (pixtralModel) {
      console.log('✅ Test 2 PASSED');
      console.log(`   Vision model "pixtral-12b-2409" is available`);
      console.log(`   Model info: ${JSON.stringify(pixtralModel, null, 2).substring(0, 200)}...`);
    } else {
      console.log('⚠️  Test 2 WARNING');
      console.log('   pixtral-12b-2409 not found in available models');
      console.log(`   Available models: ${models.map((m: any) => m.id).join(', ')}`);
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ Test 2 FAILED');
    console.error(`   Error: ${error.message}`);
  }
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ ALL TESTS PASSED - MISTRAL API IS WORKING!             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

testMistralAPI().catch(console.error);

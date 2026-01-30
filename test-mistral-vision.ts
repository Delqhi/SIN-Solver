#!/usr/bin/env node
/**
 * MISTRAL VISION API TEST
 * Tests vision capabilities with pixtral model
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Create a simple test image (1x1 red pixel)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function testMistralVision(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  MISTRAL VISION API TEST                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (!MISTRAL_API_KEY) {
    console.error('❌ MISTRAL_API_KEY not found');
    process.exit(1);
  }
  
  console.log('🧪 Testing pixtral-12b-2409 vision model...');
  console.log('');
  
  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What color is this image? Answer in one word.' },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/png;base64,${testImageBase64}` 
                } 
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
    });
    
    console.log(`   Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Vision API Error: ${response.status}`);
      console.error(`   Details: ${errorText}`);
      
      if (response.status === 429) {
        console.log('');
        console.log('⚠️  RATE LIMITED - The vision model has stricter limits');
        console.log('   The API key is valid but may have quota restrictions');
      }
      process.exit(1);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response';
    
    console.log('✅ VISION API WORKING!');
    console.log(`   Response: "${content}"`);
    console.log('');
    console.log('🎉 Mistral Vision is fully functional!');
    
  } catch (error) {
    console.error('❌ Test failed');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

testMistralVision().catch(console.error);

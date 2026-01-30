/**
 * API Connectivity Test Script
 * Tests OpenCode ZEN and Mistral API endpoints
 */

import * as dotenv from 'dotenv';
dotenv.config();

const OPENCODE_API_KEY = process.env.OPENCODE_ZEN_API_KEY || 'sk-wsoDvbl0JOfbSk5lmYJ5JZEx3fzChVBAn9xdb5NkOKuaDCdjudzFyU2UJ975ozdT';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';

async function testOpenCodeAPI(): Promise<boolean> {
  console.log('\n🔍 Testing OpenCode ZEN API...');
  console.log('   URL: https://api.opencode.ai/v1/chat/completions');
  
  try {
    const response = await fetch('https://api.opencode.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCODE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'opencode/glm-4.7-free',
        messages: [
          { role: 'user', content: 'Say "OpenCode API is working" in 5 words or less' }
        ],
        max_tokens: 50
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ OpenCode API is REACHABLE');
      console.log('   Response:', data.choices?.[0]?.message?.content || 'No content');
      return true;
    } else {
      console.log('   ❌ OpenCode API returned HTTP', response.status);
      const error = await response.text();
      console.log('   Error:', error.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log('   ❌ OpenCode API connection failed:', error.message);
    return false;
  }
}

async function testMistralAPI(): Promise<boolean> {
  console.log('\n🔍 Testing Mistral AI API...');
  console.log('   URL: https://api.mistral.ai/v1/chat/completions');
  
  if (!MISTRAL_API_KEY) {
    console.log('   ⚠️  No Mistral API key configured');
    return false;
  }
  
  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'user', content: 'Say "Mistral API is working" in 5 words or less' }
        ],
        max_tokens: 50
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Mistral API is REACHABLE');
      console.log('   Response:', data.choices?.[0]?.message?.content || 'No content');
      return true;
    } else {
      console.log('   ❌ Mistral API returned HTTP', response.status);
      const error = await response.text();
      console.log('   Error:', error.substring(0, 200));
      return false;
    }
  } catch (error) {
    console.log('   ❌ Mistral API connection failed:', error.message);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           API CONNECTIVITY TEST                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const openCodeWorking = await testOpenCodeAPI();
  const mistralWorking = await testMistralAPI();
  
  console.log('\n📊 TEST RESULTS:');
  console.log('   OpenCode ZEN:', openCodeWorking ? '✅ WORKING' : '❌ NOT WORKING');
  console.log('   Mistral AI:', mistralWorking ? '✅ WORKING' : '❌ NOT WORKING');
  
  if (openCodeWorking || mistralWorking) {
    console.log('\n✅ At least one API is working - Worker can function!');
  } else {
    console.log('\n⚠️  No APIs working - Worker will use Mock Mode');
    console.log('   To fix: Add a valid MISTRAL_API_KEY to .env file');
    console.log('   Get key from: https://console.mistral.ai/');
  }
  
  console.log('\n💡 RECOMMENDATION:');
  if (!openCodeWorking && !mistralWorking) {
    console.log('   1. Sign up for Mistral AI (free tier available)');
    console.log('   2. Get API key from https://console.mistral.ai/');
    console.log('   3. Add MISTRAL_API_KEY to .env file');
    console.log('   4. Run this test again');
  } else if (!openCodeWorking && mistralWorking) {
    console.log('   OpenCode not working, but Mistral is - Worker will use Mistral fallback');
  } else if (openCodeWorking && !mistralWorking) {
    console.log('   OpenCode working - Worker will use primary API');
  } else {
    console.log('   Both APIs working - Worker has full redundancy!');
  }
}

main().catch(console.error);

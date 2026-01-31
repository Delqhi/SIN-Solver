/**
 * CDP Connection Test for Browserless VNC Browser
 * Tests HTTP API and WebSocket connectivity
 */

const CDP_URL = 'http://127.0.0.1:50072';
const TOKEN = 'delqhi-admin';

async function testCDPConnection() {
  console.log('🔍 Testing CDP Connection to Browserless...\n');
  
  try {
    // Step 1: Test HTTP version endpoint
    console.log('Step 1: Testing HTTP version endpoint...');
    const versionRes = await fetch(`${CDP_URL}/json/version?token=${TOKEN}`);
    if (!versionRes.ok) throw new Error(`HTTP ${versionRes.status}`);
    const version = await versionRes.json();
    console.log('✅ HTTP version endpoint working');
    console.log(`   Browser: ${version.Browser}`);
    console.log(`   Protocol: ${version['Protocol-Version']}`);
    console.log(`   WebSocket URL: ${version.webSocketDebuggerUrl}`);
    
    // Step 2: Test protocol endpoint
    console.log('\nStep 2: Testing protocol endpoint...');
    const protocolRes = await fetch(`${CDP_URL}/json/protocol?token=${TOKEN}`);
    if (!protocolRes.ok) throw new Error(`HTTP ${protocolRes.status}`);
    const protocol = await protocolRes.json();
    console.log('✅ Protocol endpoint working');
    console.log(`   Protocol version: ${protocol.version?.major}.${protocol.version?.minor}`);
    
    // Step 3: Test WebSocket connection to browser
    console.log('\nStep 3: Testing WebSocket connection...');
    
    // Browserless returns ws://0.0.0.0:3000 - transform to localhost with token
    const wsUrl = version.webSocketDebuggerUrl
      .replace('0.0.0.0:3000', '127.0.0.1:50072')
      + `?token=${TOKEN}`;
    
    console.log(`   Connecting to: ${wsUrl}`);
    
    const WebSocket = require('ws');
    const ws = new WebSocket(wsUrl);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 15000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ WebSocket connected to browser');
        
        // Get list of targets
        ws.send(JSON.stringify({
          id: 1,
          method: 'Target.getTargets'
        }));
      });
      
      ws.on('message', (data: any) => {
        const msg = JSON.parse(data);
        
        if (msg.id === 1 && msg.result?.targetInfos) {
          console.log(`✅ Got ${msg.result.targetInfos.length} target(s)`);
          
          // Create a new target
          ws.send(JSON.stringify({
            id: 2,
            method: 'Target.createTarget',
            params: { url: 'about:blank' }
          }));
        }
        
        if (msg.id === 2 && msg.result?.targetId) {
          console.log(`✅ Created new target: ${msg.result.targetId}`);
          console.log(`   Target WebSocket: ${msg.result.targetId}`);
          
          // Attach to the target
          ws.send(JSON.stringify({
            id: 3,
            method: 'Target.attachToTarget',
            params: { targetId: msg.result.targetId, flatten: true }
          }));
        }
        
        if (msg.id === 3 && msg.result?.sessionId) {
          console.log(`✅ Attached to target, session: ${msg.result.sessionId.substring(0, 20)}...`);
          
          // Navigate to a test page
          ws.send(JSON.stringify({
            id: 4,
            method: 'Target.sendMessageToTarget',
            params: {
              targetId: msg.result.targetId,
              message: JSON.stringify({
                id: 5,
                method: 'Page.navigate',
                params: { url: 'https://example.com' }
              })
            }
          }));
        }
        
        if (msg.id === 4) {
          console.log('✅ Navigation command sent');
          
          // Wait a bit then close
          setTimeout(() => {
            ws.close();
            resolve(true);
          }, 2000);
        }
      });
      
      ws.on('error', (err: any) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    console.log('\n✅✅✅ ALL TESTS PASSED - CDP is working! ✅✅✅\n');
    console.log('Browserless VNC Browser is ready for automation.\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check if container is running: docker ps | grep agent-07');
    console.error('2. Check logs: docker logs agent-07-vnc-browser');
    console.error('3. Verify token: echo $VNC_PASSWORD (should be "delqhi-admin")');
    return false;
  }
}

testCDPConnection();

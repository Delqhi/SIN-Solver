const { startWebSocketServer } = require('./dist/lib/websocket-server.js');

const PORT = process.env.WS_PORT || 3001;

console.log('Starting 2Captcha Worker Dashboard Server...');
startWebSocketServer(PORT);

console.log(`WebSocket server running on ws://localhost:${PORT}`);

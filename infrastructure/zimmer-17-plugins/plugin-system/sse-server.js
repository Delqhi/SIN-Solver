const express = require('express');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { ResourceTemplate } = require('@modelcontextprotocol/sdk/common/resources.js');
const { z } = require('zod');

// Create the MCP server
const server = new McpServer({
  name: "SIN-Plugins-Hub",
  version: "1.0.0"
});

// Add a sample tool
server.tool(
  "ping",
  "Check if the plugin system is alive",
  {},
  async () => {
    return {
      content: [{ type: "text", text: "pong" }]
    };
  }
);

// Add a tool to list active plugins
server.tool(
  "list_plugins",
  "List all active SIN plugins in the empire",
  {},
  async () => {
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify([
          { name: "captcha_solver", status: "active", room: "Zimmer-14" },
          { name: "stealth_engine", status: "active", room: "Zimmer-14" },
          { name: "vision_ai", status: "active", room: "Zimmer-06" }
        ], null, 2) 
      }]
    };
  }
);

const app = express();
let transport;

app.get('/sse', async (req, res) => {
  console.log('New SSE connection');
  transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  console.log('Received message');
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No active SSE session');
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 SIN-Plugins MCP Server listening on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Message endpoint: http://localhost:${PORT}/messages`);
});

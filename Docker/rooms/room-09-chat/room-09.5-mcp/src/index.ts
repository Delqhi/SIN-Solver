import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { RocketChatClient } from "./rocketchat.js";

const PORT = process.env.PORT || 8000;
const ROCKETCHAT_URL = process.env.ROCKETCHAT_URL || "http://room-09.1-rocketchat:3000";
const ROCKETCHAT_USER_ID = process.env.ROCKETCHAT_ADMIN_USER_ID || "";
const ROCKETCHAT_AUTH_TOKEN = process.env.ROCKETCHAT_ADMIN_AUTH_TOKEN || "";

if (!ROCKETCHAT_USER_ID || !ROCKETCHAT_AUTH_TOKEN) {
  console.warn("ROCKETCHAT_ADMIN_USER_ID or ROCKETCHAT_ADMIN_AUTH_TOKEN not set. MCP tools may fail.");
}

const rcClient = new RocketChatClient({
  url: ROCKETCHAT_URL,
  userId: ROCKETCHAT_USER_ID,
  authToken: ROCKETCHAT_AUTH_TOKEN,
});

const server = new Server(
  {
    name: "delqhi-chat-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool Definitions
const TOOLS = [
  {
    name: "post_message",
    description: "Post a message to a channel",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel name or ID" },
        text: { type: "string", description: "Message content" },
      },
      required: ["channel", "text"],
    },
  },
  {
    name: "list_channels",
    description: "List all public channels",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_channel",
    description: "Create a new channel",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        members: { type: "array", items: { type: "string" } },
        readOnly: { type: "boolean" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_history",
    description: "Get message history from a channel",
    inputSchema: {
      type: "object",
      properties: {
        roomId: { type: "string" },
        count: { type: "number" },
      },
      required: ["roomId"],
    },
  },
  {
    name: "rocketchat_api",
    description: "Call any Rocket.Chat API endpoint",
    inputSchema: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] },
        endpoint: { type: "string" },
        data: { type: "object" },
      },
      required: ["method", "endpoint"],
    },
  },
];

// Handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("No arguments provided");
  }

  try {
    let result;
    switch (name) {
      case "post_message":
        result = await rcClient.postMessage(args.channel as string, args.text as string);
        break;
      case "list_channels":
        result = await rcClient.listChannels();
        break;
      case "create_channel":
        result = await rcClient.createChannel(
          args.name as string,
          args.members as string[],
          args.readOnly as boolean
        );
        break;
      case "get_history":
        result = await rcClient.getHistory(args.roomId as string, args.count as number);
        break;
      case "rocketchat_api":
        result = await rcClient.request(
          args.method as string,
          args.endpoint as string,
          args.data
        );
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// SSE Server Implementation
const app = express();

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  res.sendStatus(200);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Delqhi-Chat MCP Server running on SSE at http://localhost:${PORT}/sse`);
});

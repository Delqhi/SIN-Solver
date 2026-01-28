"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const rocketchat_1 = require("./rocketchat");
const ROCKETCHAT_URL = process.env.ROCKETCHAT_URL || "http://room-09.1-delqhi-chat-app:3000";
const ROCKETCHAT_USER_ID = process.env.ROCKETCHAT_ADMIN_USER_ID || "";
const ROCKETCHAT_AUTH_TOKEN = process.env.ROCKETCHAT_ADMIN_AUTH_TOKEN || "";
if (!ROCKETCHAT_USER_ID || !ROCKETCHAT_AUTH_TOKEN) {
    console.warn("ROCKETCHAT_ADMIN_USER_ID or ROCKETCHAT_ADMIN_AUTH_TOKEN not set. MCP tools may fail.");
}
const rcClient = new rocketchat_1.RocketChatClient({
    url: ROCKETCHAT_URL,
    userId: ROCKETCHAT_USER_ID,
    authToken: ROCKETCHAT_AUTH_TOKEN,
});
const server = new index_js_1.Server({
    name: "delqhi-chat-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
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
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: TOOLS,
    };
});
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (!args) {
        throw new Error("No arguments provided");
    }
    try {
        let result;
        switch (name) {
            case "post_message":
                result = await rcClient.postMessage(args.channel, args.text);
                break;
            case "list_channels":
                result = await rcClient.listChannels();
                break;
            case "create_channel":
                result = await rcClient.createChannel(args.name, args.members, args.readOnly);
                break;
            case "get_history":
                result = await rcClient.getHistory(args.roomId, args.count);
                break;
            case "rocketchat_api":
                result = await rcClient.request(args.method, args.endpoint, args.data);
                break;
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Delqhi-Chat MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});

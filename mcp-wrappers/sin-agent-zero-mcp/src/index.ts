import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

const server = new McpServer({
  name: "sin-agent-zero-mcp",
  version: "1.0.0",
});

const ROOMS: Record<string, string> = {
  "03": "http://172.20.0.50:8000",
  "05": "http://172.20.0.20:3000",
  "13": "http://172.20.0.31:8000",
  "17": "http://172.20.0.40:8000",
};

server.registerTool(
  "control_room",
  {
    description: "Send a command to a specific room/container",
    inputSchema: {
      room: z.enum(["03", "05", "13", "17"]).describe("The room number"),
      action: z.string().describe("The action to perform"),
      params: z.any().optional().describe("Optional parameters for the action"),
    },
  },
  async ({ room, action, params }) => {
    try {
      const url = `${ROOMS[room]}/execute`;
      const response = await axios.post(url, { action, params });
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Room ${room} Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "browser_task",
  {
    description: "Execute a browser task via Steel (Room 05)",
    inputSchema: {
      goal: z.string().describe("The objective for the browser"),
      url: z.string().url().optional().describe("Initial URL"),
    },
  },
  async ({ goal, url }) => {
    try {
      const response = await axios.post(`${ROOMS["05"]}/task`, { goal, url });
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Steel Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "logical_synthesis",
  {
    description: "Synthesize logic or code via Agent Zero Core (Room 03)",
    inputSchema: {
      specification: z.string().describe("The logic/code specification"),
    },
  },
  async ({ specification }) => {
    try {
      const response = await axios.post(`${ROOMS["03"]}/synthesize`, { specification });
      return {
        content: [{ type: "text", text: response.data.result }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Agent Zero Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "query_empire_library",
  {
    description: "Query the central Postgres library (Room 10) for historical knowledge or patterns",
    inputSchema: {
      query: z.string().describe("SQL query or natural language search term"),
      limit: z.number().optional().default(10),
    },
  },
  async ({ query, limit }) => {
    try {
      const response = await axios.post(`${ROOMS["13"]}/proxy/room10/query`, { query, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(response.data.results, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Library Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "vault_operation",
  {
    description: "Manage secrets and API keys via the Vault (Room 13)",
    inputSchema: {
      action: z.enum(["rotate", "get", "status"]),
      key_name: z.string().describe("Name of the secret or key"),
    },
  },
  async ({ action, key_name }) => {
    try {
      const response = await axios.post(`${ROOMS["13"]}/vault/${action}`, { key_name });
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Vault Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "system_recovery",
  {
    description: "Trigger recovery protocols for a specific room (Room 01)",
    inputSchema: {
      room_id: z.string().describe("The ID of the room to recover/reboot"),
      reason: z.string().describe("Reason for recovery"),
    },
  },
  async ({ room_id, reason }) => {
    try {
      const response = await axios.post(`${ROOMS["03"]}/proxy/room01/recover`, { room_id, reason });
      return {
        content: [{ type: "text", text: `Recovery initiated for Room ${room_id}: ${response.data.status}` }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Recovery Error: ${error.message}` }],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agent Zero MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

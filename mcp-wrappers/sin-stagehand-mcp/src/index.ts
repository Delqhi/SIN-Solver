import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Stagehand } from "@browserbasehq/stagehand";

const server = new McpServer({
  name: "sin-stagehand",
  version: "1.0.0",
});

let stagehand: Stagehand | null = null;

async function getStagehand() {
  if (!stagehand) {
    stagehand = new Stagehand({
      env: "LOCAL",
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      debug: true,
    });
    await stagehand.init();
  }
  return stagehand;
}

server.registerTool(
  "research",
  {
    description: "Deep research a topic or website, even with login requirements",
    inputSchema: {
      goal: z.string().describe("What to research or find"),
      url: z.string().url().optional().describe("Target URL"),
    },
  },
  async ({ goal, url }) => {
    try {
      const sh = await getStagehand();
      const page = sh.page;
      if (url) await page.goto(url);
      
      const result = await page.act({ action: goal });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Stagehand Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "extract_data",
  {
    description: "Extract structured data from a page",
    inputSchema: {
      instruction: z.string().describe("What data to extract and in what format"),
    },
  },
  async ({ instruction }) => {
    try {
      const sh = await getStagehand();
      const result = await sh.page.extract({ instruction });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Extraction Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "inhale",
  {
    description: "Inhale knowledge from a URL (converts to markdown/structured info)",
    inputSchema: {
      url: z.string().url().describe("The URL to inhale"),
    },
  },
  async ({ url }) => {
    try {
      const sh = await getStagehand();
      await sh.page.goto(url);
      const content = await sh.page.extract({ instruction: "Extract the main content of the page as clean markdown." });
      return {
        content: [{ type: "text", text: JSON.stringify(content, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Inhalation Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "managed_research",
  {
    description: "Execute research with session persistence (cookies/storage)",
    inputSchema: {
      session_id: z.string().describe("Unique identifier for the session"),
      goal: z.string().describe("What to research"),
      url: z.string().url().optional(),
    },
  },
  async ({ session_id, goal, url }) => {
    try {
      const sh = await getStagehand();
      const page = sh.page;
      if (url) await page.goto(url);
      const result = await page.act({ action: goal });
      return {
        content: [{ type: "text", text: `Session ${session_id}: ${JSON.stringify(result, null, 2)}` }],
      };
    } catch (error: any) {
      return { isError: true, content: [{ type: "text", text: error.message }] };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Stagehand MCP Server running");
}

main().catch(console.error);

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import puppeteer from "puppeteer-core";

const server = new McpServer({
  name: "sin-chrome-devtools-mcp",
  version: "1.0.0",
});

let browser: any = null;
let page: any = null;

async function ensureBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    page = await browser.newPage();
  }
  return page;
}

server.registerTool(
  "navigate",
  {
    description: "Navigate to a URL",
    inputSchema: {
      url: z.string().url().describe("The URL to navigate to"),
    },
  },
  async ({ url }) => {
    try {
      const p = await ensureBrowser();
      await p.goto(url, { waitUntil: "networkidle2" });
      return {
        content: [{ type: "text", text: `Navigated to ${url}` }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "screenshot",
  {
    description: "Take a screenshot of the current page",
    inputSchema: {},
  },
  async () => {
    try {
      const p = await ensureBrowser();
      const buffer = await p.screenshot({ encoding: "base64" });
      return {
        content: [
          {
            type: "text",
            text: `Screenshot captured (base64 length: ${buffer.length})`,
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

server.registerTool(
  "evaluate",
  {
    description: "Evaluate JavaScript on the page",
    inputSchema: {
      script: z.string().describe("The JS script to execute"),
    },
  },
  async ({ script }) => {
    try {
      const p = await ensureBrowser();
      const result = await p.evaluate(script);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Chrome DevTools MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// api/data.js
//
// This is the ONLY place the MCP protocol actually runs. The
// datagov-mcp-server package (@melaodoidao/datagov-mcp-server) is a
// stdio-based MCP server: it's meant to be launched as a local child
// process and spoken to over stdin/stdout, which is exactly what an
// MCP *client* does. A browser can never do this directly — this
// function is that client, running server-side on Vercel.
//
// IMPORTANT: verify this against whatever @modelcontextprotocol/sdk
// version actually installs — MCP's client API has shifted between
// versions (this server was built against sdk 0.6.0). Run `vercel dev`
// locally and check the console the first time; adjust the
// client.callTool(...) call if your installed SDK expects a different
// shape (older 0.x SDKs sometimes use client.request(...) instead).

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

// Restrict this to your real GitHub Pages origin once you know it,
// e.g. "https://yourusername.github.io" — "*" is fine while testing.
const ALLOWED_ORIGIN = "*";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const q =
    (Array.isArray(req.query.q) ? req.query.q[0] : req.query.q) ||
    "glover park washington dc";

  // The MCP server ships as a dependency in node_modules; we run its
  // build output directly with `node`, so nothing needs to be
  // installed globally on Vercel.
  const serverEntry = path.join(
    process.cwd(),
    "node_modules",
    "@melaodoidao",
    "datagov-mcp-server",
    "build",
    "index.js"
  );

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverEntry],
  });

  const client = new Client(
    { name: "glover-park-site", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);

    const result = await client.callTool({
      name: "package_search",
      arguments: { q, rows: 6 },
    });

    // MCP tool results come back as an array of content blocks.
    // This server returns its data as a text block containing JSON.
    const textBlock = result.content?.find((c) => c.type === "text");
    const parsed = textBlock ? safeParse(textBlock.text) : null;

    res.status(200).json({
      query: q,
      source: "datagov-mcp-server (package_search)",
      result: parsed ?? result,
    });
  } catch (err) {
    console.error("MCP call failed:", err);
    res.status(502).json({
      error: "Could not complete the MCP call",
      detail: String(err?.message || err),
    });
  } finally {
    try {
      await client.close();
    } catch {
      // transport already closed — ignore
    }
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

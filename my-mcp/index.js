import express from "express";
import { McpServer, ToolDefinition } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const port = process.env.PORT || 3000;
const app = express();
app.use(express.json());

// --- Define MCP Server ---
const mcpServer = new McpServer(
    { name: "SimpleEchoServer", version: "1.0.0" },
    { capabilities: {} }
);

// Register an "echo" tool
mcpServer.tool(
    new ToolDefinition("echo", {
        description: "Echoes back the input text",
        call: async ({ text }) => {
            return { text };
        }
    })
);

// --- Manage Transports (SSE Connections) ---
const transports = new Map();

// Client opens SSE stream here
app.get("/sse", (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);
    mcpServer.connect(transport);
});

// Client sends tool calls here
app.post("/messages", (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId || !transports.has(sessionId)) {
        return res.status(400).json({ error: "Invalid or missing sessionId" });
    }
    transports.get(sessionId).handlePostMessage(req, res);
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`MCP SSE server is running at http://localhost:${port}`);
});

// import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import {
//     CallToolRequestSchema,
//     ErrorCode,
//     ListToolsRequestSchema,
//     McpError,
// } from "@modelcontextprotocol/sdk/types.js";

// const server = new Server({
//     name: "mcp-server",
//     version: "1.0.0",
// }, {
//     capabilities: {
//         tools: {}
//     }
// });

// server.setRequestHandler(ListToolsRequestSchema, async () => {
//     return {
//         tools: [{
//             name: "calculate_sum",
//             description: "Add two numbers together",
//             inputSchema: {
//                 type: "object",
//                 properties: {
//                     a: { type: "number" },
//                     b: { type: "number" }
//                 },
//                 required: ["a", "b"]
//             }
//         }]
//     };
// });

// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//     if (request.params.name === "calculate_sum") {
//         const { a, b } = request.params.arguments as { a: number; b: number };
//         return { toolResult: a + b };
//     }
//     throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
// });

// const transport = new StdioServerTransport();
// await server.connect(transport);


// ************************************************************************************************
// ********************************     only for testing email    *********************************
// ************************************************************************************************
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    McpError,
    ErrorCode
} from "@modelcontextprotocol/sdk/types.js";

function createMcpServer() {
    const server = new Server(
        { name: "mcp-server", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [{
            name: "calculate_sum",
            description: "Add two numbers together",
            inputSchema: {
                type: "object",
                properties: { a: { type: "number" }, b: { type: "number" } },
                required: ["a", "b"],
            },
        }],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === "calculate_sum") {
            const { a, b } = request.params.arguments as { a: number; b: number };
            return { toolResult: a + b };
        }
        throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
    });

    return server;
}


const app = express();
app.use(express.json());

app.post("/server", async (req, res) => {
    try {
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on("close", () => {
            transport.close();
            server.close();
        });
    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: "2.0",
                error: { code: -32603, message: "Internal server error" },
                id: null,
            });
        }
    }
});

app.listen(3000, () => console.log("Listening on http://localhost:3000/server"));

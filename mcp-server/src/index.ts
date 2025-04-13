import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server({
    name: "mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {}
    }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
            name: "calculate_sum",
            description: "Add two numbers together",
            inputSchema: {
                type: "object",
                properties: {
                    a: { type: "number" },
                    b: { type: "number" }
                },
                required: ["a", "b"]
            }
        }]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "calculate_sum") {
        const { a, b } = request.params.arguments as { a: number; b: number };
        return { toolResult: a + b };
    }
    throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);


// ************************************************************************************************
// ********************************     only for testing email    *********************************
// ************************************************************************************************

// import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import {
//     CallToolRequestSchema,
//     ErrorCode,
//     ListToolsRequestSchema,
//     McpError,
// } from "@modelcontextprotocol/sdk/types.js";
// import puppeteer from "puppeteer";

// const MAGICCHAT_SIGNIN_URL = "https://www.magicchat.ai/signin";
// const MAGICCHAT_DASHBOARD_URL = "https://www.magicchat.ai/dashboard/bots";

// // Create MCP Server instance
// const server = new Server(
//     { name: "mcp-server", version: "1.0.0" },
//     { capabilities: { tools: {} } }
// );

// // Register the login tool with MCP
// server.setRequestHandler(ListToolsRequestSchema, async () => {
//     return {
//         tools: [
//             {
//                 name: "login_to_magicchat",
//                 description: "Logs into MagicChat using the provided credentials",
//                 inputSchema: {
//                     type: "object",
//                     properties: {
//                         email: { type: "string" },
//                         password: { type: "string" }
//                     },
//                     required: ["email", "password"],
//                 },
//             },
//         ],
//     };
// });

// // Function to log in to MagicChat
// async function loginToMagicChat(email: string, password: string) {
//     const browser = await puppeteer.launch({ headless: false, slowMo: 50 }); // SlowMo helps debugging
//     const page = await browser.newPage();

//     try {
//         console.log("Opening MagicChat...");
//         await page.goto(MAGICCHAT_SIGNIN_URL, { waitUntil: "networkidle2" });

//         // Wait for login fields
//         await page.waitForSelector("input[type='email']", { timeout: 60000 });
//         await page.waitForSelector("input[type='password']", { timeout: 60000 });

//         // Enter credentials
//         console.log("Entering credentials...");
//         await page.type("input[type='email']", email);
//         await page.type("input[type='password']", password);

//         // Try different button selectors
//         console.log("Looking for Sign in button...");
//         const signInButton = await Promise.race([
//             page.waitForSelector("button[type='submit']", { timeout: 60000 }),
//             page.waitForSelector("button.signin-btn", { timeout: 60000 }), // Replace if needed
//             page.waitForSelector("#signin-button", { timeout: 60000 }), // Replace if needed
//         ]);

//         if (!signInButton) {
//             console.error("Sign in button not found!");
//             await browser.close();
//             return "Login failed: Sign in button not found.";
//         }

//         // Click sign-in button
//         await signInButton.click();
//         console.log("Clicked Sign in button.");

//         // Wait for navigation to dashboard
//         await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

//         // Check if user email is visible in sidebar
//         const emailVisible = await page.$("div.sidebar-user-email"); // Adjust this selector

//         if (emailVisible) {
//             console.log("Login successful!");
//             await browser.close();
//             return "Login successful!";
//         } else {
//             console.log("Login failed. Please check your credentials.");
//             await browser.close();
//             return "Login failed. Please check your credentials.";
//         }
//     } catch (error) {
//         console.error("Error during login:", error);
//         await browser.close();
//         return `Error during login: ${error}`;
//     }
// }


// // Handle login requests via MCP
// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//     if (request.params.name === "login_to_magicchat") {
//         const { email, password } = request.params.arguments as { email: string; password: string };

//         try {
//             const loginStatus = await loginToMagicChat(email, password);
//             return { toolResult: loginStatus };
//         } catch (error) {
//             return { toolResult: `Error: ${error}` };
//         }
//     }

//     throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
// });

// // Connect MCP transport
// const transport = new StdioServerTransport();
// await server.connect(transport);


// ************************************************************************************************
// ********************************     MagicChat MCP Server     **********************************
// ************************************************************************************************

// import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import {
//     CallToolRequestSchema,
//     ErrorCode,
//     ListToolsRequestSchema,
//     McpError,
// } from "@modelcontextprotocol/sdk/types.js";
// import puppeteer from "puppeteer";

// const MAGICCHAT_SIGNIN_URL = "https://www.magicchat.ai/signin";
// const MAGICCHAT_DASHBOARD_URL = "https://www.magicchat.ai/dashboard";
// const MAGICCHAT_BOTS_URL = "https://www.magicchat.ai/dashboard/bots";

// const server = new Server(
//     { name: "mcp-server", version: "1.0.0" },
//     { capabilities: { tools: {} } }
// );

// // List available tools for MCP
// server.setRequestHandler(ListToolsRequestSchema, async () => {
//     return {
//         tools: [
//             {
//                 name: "create_bot",
//                 description: "Create a bot in MagicChat with a specified name",
//                 inputSchema: {
//                     type: "object",
//                     properties: {
//                         bot_name: { type: "string" },
//                         email: { type: "string" },
//                         password: { type: "string" }
//                     },
//                     required: ["bot_name", "email", "password"],
//                 },
//             },
//         ],
//     };
// });

// // Function to log in to MagicChat
// async function loginToMagicChat(page: puppeteer.Page, email: string, password: string) {
//     console.log("Opening MagicChat...");
//     await page.goto(MAGICCHAT_SIGNIN_URL, { waitUntil: "networkidle2" });

//     // Wait for login fields
//     await page.waitForSelector("input[type='email']", { timeout: 60000 });
//     await page.waitForSelector("input[type='password']", { timeout: 60000 });

//     // Enter credentials
//     console.log("Entering credentials...");
//     await page.type("input[type='email']", email);
//     await page.type("input[type='password']", password);

//     // Click sign-in button
//     console.log("Looking for Sign in button...");
//     await page.waitForSelector("button[type='submit']", { timeout: 60000 });
//     await page.click("button[type='submit']");

//     // Wait for navigation to dashboard
//     await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

//     // Check if the email is visible in the sidebar to confirm login
//     const emailVisible = await page.$("div.sidebar-user-email"); // Adjust selector if needed
//     if (emailVisible) {
//         console.log("Login successful!");
//     } else {
//         throw new Error("Login failed. Please check your credentials.");
//     }
// }

// // Function to navigate to the "Bots" section by clicking "View all bots" on the dashboard page
// async function navigateToBotsPage(page: puppeteer.Page) {
//     console.log("Navigating to Bots section...");

//     await page.goto(MAGICCHAT_DASHBOARD_URL, { waitUntil: "networkidle2" });

//     await page.waitForSelector("button[type='button']", { timeout: 60000 });
//     await page.click("button[type='button']");

//     // await page.waitForSelector("a:has-text('Bots')", { timeout: 30000 });
//     // await page.click("a:has-text('Bots')");

//     const clicked = await page.evaluate(() => {
//         const botsLink = Array.from(document.querySelectorAll("a"))
//             .find(el => el.textContent?.trim() === "Bots");
//         if (botsLink) {
//             (botsLink as HTMLElement).click();
//             return true;
//         }
//         return false;
//     });

//     if (!clicked) {
//         throw new Error("Bots link not found!");
//     }



//     // // Wait for the "View all bots" button on the dashboard
//     // await page.waitForSelector("a:has-text('View all bots')", { timeout: 30000 });

//     // // Click the button
//     // console.log("Clicking 'View all bots'...");
//     // await page.click("a:has-text('View all bots')");

//     // Wait for the Bots page to load
//     await page.waitForSelector("button:has-text('+ Add Bot')", { timeout: 30000 });

//     console.log("Now on the Bots page.");
// }


// // Function to create a MagicChat bot after login and navigating to Bots page
// async function createMagicChatBot(botName: string, email: string, password: string) {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     await page.goto(MAGICCHAT_BOTS_URL, { waitUntil: "networkidle2" });

//     try {
//         // Log in before creating a bot
//         // await loginToMagicChat(page, email, password);

//         // Navigate to "Bots" section
//         // await navigateToBotsPage(page);

//         await page.waitForSelector("button:has-text('+ Add Bot')", { timeout: 60000, visible: true });
//         await page.click("button:has-text('+ Add Bot')", { delay: 100 });
//         console.log("Clicked '+ Add Bot' button successfully.");


//         // Wait for the bot creation form
//         await page.waitForSelector("input[placeholder='what would you like to call your bot?']", { timeout: 60000 });

//         // Fill out the bot name
//         console.log(`Entering bot name: ${botName}`);
//         await page.type("input[placeholder='what would you like to call your bot?']", botName);

//         // Select "Customer Support Agent" as the role
//         await page.select("select", "Customer Support Agent");

//         // Click the "Create MagicChat" button
//         console.log("Creating the bot...");
//         await page.waitForSelector("button:has-text('Create MagicChat')", { timeout: 60000 });
//         await page.click("button:has-text('Create MagicChat')");

//         // Wait for the bot to be created and get its URL
//         await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });
//         const botUrl = page.url();

//         console.log(`Bot "${botName}" created successfully! URL: ${botUrl}`);

//         await browser.close();
//         return botUrl;
//     } catch (error) {
//         console.error("Error creating bot:", error);
//         await browser.close();
//         throw new Error("Failed to create bot. Please try again.");
//     }
// }

// // Handle create_bot request via MCP
// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//     if (request.params.name === "create_bot") {
//         const { bot_name, email, password } = request.params.arguments as { bot_name: string; email: string; password: string };

//         try {
//             const botUrl = await createMagicChatBot(bot_name, email, password);
//             return {
//                 toolResult: `Bot "${bot_name}" created successfully! You can manage it here: ${botUrl}`,
//             };
//         } catch (error) {
//             return {
//                 toolResult: `Error: ${error}`,
//             };
//         }
//     }

//     throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
// });

// // Connect MCP transport
// const transport = new StdioServerTransport();
// await server.connect(transport);


// ************************************************************************************************
// ********************************   MagicChat MCP fetching data  **********************************
// ************************************************************************************************

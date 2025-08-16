import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
// MagicSlides API Endpoints
const MAGICSLIDES_API_URL = "https://www.magicslides.app/api/generate-editable-mcp";
//const MAGICSLIDES_API_URL = "http://localhost:3005/api/v2/create_ppt_from_summary";
const ACCOUNT_INFO_API_URL = "https://www.magicslides.app/api/fetch-account-info-using-accountid";
// const ACCOUNT_INFO_API_URL = "http://localhost:3000/api/fetch-account-info-using-accountid";
const PRICING_PAGE_URL = "https://www.magicslides.app/pricing";
const YOUTUBE_TRANSCRIPT_API_URL = "https://youtube-transcripts-main.onrender.com/get-youtube-transcript";
// Get access_id from environment variable
const ACCESS_ID = process.env.MAGICSLIDES_ACCESS_ID ?? "";
if (!ACCESS_ID) {
    console.error("Warning: MAGICSLIDES_ACCESS_ID environment variable is not set.");
    console.error("The server will start, but calls to create_ppt_from_text will return a configuration error until this is set.");
}
// Function to check if a string is a YouTube URL
function isYoutubeUrl(text) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(text);
}
// Function to fetch YouTube transcript
async function fetchYoutubeTranscript(ytUrl) {
    try {
        const response = await axios.post(YOUTUBE_TRANSCRIPT_API_URL, { ytUrl }, {
            timeout: 30000 // 30 second timeout
        });
        if (!response.data || !response.data.transcript) {
            throw new Error("Failed to fetch YouTube transcript.");
        }
        return response.data.transcript;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error fetching YouTube transcript: ${error.message}`);
        }
        throw new Error("Unknown error occurred while fetching YouTube transcript.");
    }
}
// Function to fetch account details
async function fetchAccountInfo(accessId) {
    try {
        const response = await axios.post(ACCOUNT_INFO_API_URL, { access_id: accessId }, {
            headers: { "Content-Type": "application/json" },
            timeout: 30000 // 30 second timeout
        });
        const accessInfo = response.data;
        if (!accessInfo.email || !accessInfo.plan || !accessInfo.workspace_id) {
            throw new Error("Invalid access data received. Please check your access ID.");
        }
        const { email, plan, workspace_id } = accessInfo;
        const allowedPlans = ["essential", "paid", "premium"];
        if (!allowedPlans.includes(plan.toLowerCase())) {
            throw new Error(`Your plan (${plan}) does not allow generating PowerPoints. Upgrade here: ${PRICING_PAGE_URL}`);
        }
        return { email, plan, workspace_id };
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("Unknown error occurred.");
    }
}
// Function to parse user text for specific parameters
function parseUserParameters(userText) {
    const text = userText.toLowerCase();
    const params = {};
    // Parse model preference
    if (text.includes('gpt-4') || text.includes('gpt4')) {
        params.model = 'gpt-4';
    }
    else if (text.includes('gemini')) {
        params.model = 'gemini';
    }
    // Parse template preference
    if (text.includes('ed-bullet-point2') || text.includes('bullet point 2')) {
        params.template = 'ed-bullet-point2';
    }
    else if (text.includes('ed-bullet-point1') || text.includes('bullet point 1')) {
        params.template = 'ed-bullet-point1';
    }
    // Parse image preference
    if (text.includes('google images') || text.includes('include images') || text.includes('with images')) {
        params.imageForEachSlide = true;
    }
    // Parse slide count
    const slideMatch = text.match(/(\d+)\s*slides?/);
    if (slideMatch) {
        params.slideCount = parseInt(slideMatch[1], 10);
    }
    return params;
}
// Function to extract parameters
async function fetchDetailsFromAPI(userText) {
    // First, parse user parameters directly from text
    const userParams = parseUserParameters(userText);
    try {
        const response = await axios.post('https://video-and-audio-description-qh4z.onrender.com/api/v1/fetch-slide-generation-data', { text: userText }, { headers: { "Content-Type": "application/json" }, timeout: 30000 });
        if (!response.data) {
            throw new Error("Invalid API response from fetch-data endpoint.");
        }
        // Log API response data to stderr to avoid JSON parsing errors
        console.error('API Response:', JSON.stringify(response.data, null, 2));
        // Set default values, but prioritize user-specified parameters
        let topic = userText.trim();
        let slideCount = userParams.slideCount || 10;
        let imageForEachSlide = userParams.imageForEachSlide !== undefined ? userParams.imageForEachSlide : false;
        let language = "en";
        let model = userParams.model || "gemini";
        let template = userParams.template || "ed-bullet-point1";
        let image_source = "google";
        // Extract values from API response, but don't override user-specified parameters
        if (response.data.slideCount && !userParams.slideCount) {
            slideCount = parseInt(response.data.slideCount, 10);
        }
        if (response.data.language) {
            language = response.data.language;
        }
        if (response.data.model && !userParams.model) {
            model = response.data.model.toLowerCase();
        }
        if (response.data.template && !userParams.template) {
            template = response.data.template.toLowerCase();
        }
        if (response.data.imageForEachSlide !== undefined && userParams.imageForEachSlide === undefined) {
            imageForEachSlide = response.data.imageForEachSlide;
        }
        // Handle image_source field
        if (response.data.image_source) {
            image_source = response.data.image_source;
        }
        // Use msSummaryText if provided
        if (response.data.msSummaryText) {
            topic = response.data.msSummaryText;
        }
        return {
            topic,
            slideCount,
            imageForEachSlide,
            language,
            model,
            template,
            image_source
        };
    }
    catch (error) {
        console.error("Error fetching details from API:", error);
        // Fallback to user-specified parameters or defaults
        return {
            topic: userText.trim(),
            slideCount: userParams.slideCount || 10,
            imageForEachSlide: userParams.imageForEachSlide !== undefined ? userParams.imageForEachSlide : false,
            language: "en",
            model: userParams.model || "gemini",
            template: userParams.template || "ed-bullet-point1",
            image_source: "google"
        };
    }
}
// Function to create PPT
async function createPPTFromText(userText, accessId) {
    const { email, plan, workspace_id } = await fetchAccountInfo(accessId);
    // Check if the input is a YouTube URL and fetch transcript if it is
    let topicText = userText;
    if (isYoutubeUrl(userText)) {
        console.error("YouTube URL detected, fetching transcript...");
        topicText = await fetchYoutubeTranscript(userText);
    }
    const { topic, slideCount, imageForEachSlide, language, model, template, image_source } = await fetchDetailsFromAPI(topicText);
    const requestData = {
        topic: topic, //
        slidelength: slideCount || 10, //
        templateName: template || "ed-bullet-point1", //
        imageSource: image_source || "google", //
        includeImages: imageForEachSlide || false, //
        language: language || "en", //
        userEmail: email,
        workspace_slug: workspace_id, //
        preserveText: false,
        presentationId: uuidv4(), //
        webSearch: true,
        plan: plan,
        model: model || "gemini", //
        cache: true,
        source: "mcp-tool", //
    };
    console.error("Request Data:", requestData);
    try {
        const response = await axios.post(MAGICSLIDES_API_URL, requestData, {
            headers: { "Content-Type": "application/json" },
            timeout: 60000 // 60 second timeout for PPT generation
        });
        if (!response.data || typeof response.data !== "object" || !response.data.success) {
            throw new Error("Invalid API response.");
        }
        return {
            success: response.data.success,
            presentationUrl: response.data.presentationUrl,
            presentationId: response.data.presentationId,
            slideCount: response.data.slideCount
        };
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("Unknown error occurred.");
    }
}
// MCP Server Setup
console.error("Starting MagicSlides MCP Server...");
// Add a small delay to ensure proper initialization
await new Promise(resolve => setTimeout(resolve, 100));
const server = new Server({ name: "magicslides-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "create_ppt_from_text",
            description: "Generate a PowerPoint from text or YouTube URL",
            inputSchema: {
                type: "object",
                properties: {
                    userText: { type: "string", description: "The content for the presentation. Can include specific requirements like model (gpt-4/gemini), template (ed-bullet-point1/ed-bullet-point2), slide count, and whether to include images." }
                },
                required: ["userText"]
            }
        },
        {
            name: "get_youtube_transcript",
            description: "Fetch transcript from a YouTube video URL",
            inputSchema: {
                type: "object",
                properties: {
                    ytUrl: { type: "string", description: "YouTube video URL" }
                },
                required: ["ytUrl"]
            }
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "create_ppt_from_text") {
        try {
            const args = request.params.arguments;
            if (!args || !args.userText)
                throw new Error("Missing userText parameter.");
            if (!ACCESS_ID) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "❌ Configuration error: MAGICSLIDES_ACCESS_ID is not set. Please configure this environment variable in your Smithery deployment or client settings and restart."
                        }
                    ]
                };
            }
            const result = await createPPTFromText(args.userText, ACCESS_ID);
            return {
                content: [
                    {
                        type: "text",
                        text: `🎉 SUCCESS! Your presentation has been created!

PRESENTATION URL: ${result.presentationUrl}

Copy and paste this URL into your browser to open your presentation in the MagicSlides editor.`
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
                    }
                ]
            };
        }
    }
    else if (request.params.name === "get_youtube_transcript") {
        try {
            const args = request.params.arguments;
            if (!args || !args.ytUrl)
                throw new Error("Missing YouTube URL parameter.");
            if (!isYoutubeUrl(args.ytUrl)) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `❌ Error: Invalid YouTube URL: ${args.ytUrl}`
                        }
                    ]
                };
            }
            console.error("Fetching transcript for:", args.ytUrl);
            const transcript = await fetchYoutubeTranscript(args.ytUrl);
            return {
                content: [
                    {
                        type: "text",
                        text: `📝 YouTube Transcript:\n\n${transcript}`
                    }
                ]
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
                    }
                ]
            };
        }
    }
    throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
});
const transport = new StdioServerTransport();
console.error("Connecting to transport...");
try {
    await server.connect(transport);
    console.error("Server connected successfully!");
}
catch (error) {
    console.error("Failed to connect server:", error);
    process.exit(1);
}

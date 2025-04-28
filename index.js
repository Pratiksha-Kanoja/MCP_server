import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
// MagicSlides API Endpoints
const MAGICSLIDES_API_URL = "https://magicslides-tools-api.onrender.com/api/v2/create_ppt_from_summary";
//const MAGICSLIDES_API_URL = "http://localhost:3005/api/v2/create_ppt_from_summary";
const ACCOUNT_INFO_API_URL = "https://www.magicslides.app/api/fetch-account-info-using-accountid";
const PRICING_PAGE_URL = "https://www.magicslides.app/pricing";
const YOUTUBE_TRANSCRIPT_API_URL = "https://youtube-transcripts-main.onrender.com/get-youtube-transcript";
// Function to check if a string is a YouTube URL
function isYoutubeUrl(text) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(text);
}
// Function to fetch YouTube transcript
async function fetchYoutubeTranscript(ytUrl) {
    try {
        const response = await axios.post(YOUTUBE_TRANSCRIPT_API_URL, { ytUrl });
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
async function fetchAccountInfo(accountId) {
    try {
        const response = await axios.post(ACCOUNT_INFO_API_URL, { account_id: accountId }, {
            headers: { "Content-Type": "application/json" },
        });
        if (!Array.isArray(response.data) || response.data.length === 0) {
            throw new Error("Invalid account ID. Please provide a correct account ID.");
        }
        const accountInfo = response.data[0];
        if (!accountInfo.email || !accountInfo.plan) {
            throw new Error("Invalid account data received. Please check your account ID.");
        }
        const { email, plan } = accountInfo;
        const allowedPlans = ["essential", "paid", "premium"];
        if (!allowedPlans.includes(plan.toLowerCase())) {
            throw new Error(`Your plan (${plan}) does not allow generating PowerPoints. Upgrade here: ${PRICING_PAGE_URL}`);
        }
        return { email, plan };
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("Unknown error occurred.");
    }
}
// Function to extract parameters
async function fetchDetailsFromAPI(userText) {
    try {
        const response = await axios.post('https://video-and-audio-description-qh4z.onrender.com/api/v1/fetch-slide-generation-data', { text: userText }, { headers: { "Content-Type": "application/json" } });
        if (!response.data) {
            throw new Error("Invalid API response from fetch-data endpoint.");
        }
        // Log API response data without text prefix to avoid JSON parsing errors
        console.log(response.data);
        // Set default values
        let topic = userText.trim();
        let slideCount = 10;
        let imageForEachSlide = false;
        let language = "en";
        let model = "gemini";
        let template = "bullet-point1";
        let image_source = "google";
        // Extract values from API response
        if (response.data.slideCount) {
            slideCount = parseInt(response.data.slideCount, 10);
        }
        if (response.data.language) {
            language = response.data.language;
        }
        if (response.data.model) {
            model = response.data.model.toLowerCase();
        }
        if (response.data.template) {
            template = response.data.template.toLowerCase();
        }
        if (response.data.imageForEachSlide !== undefined) {
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
        // Fallback to default values if API call fails
        return {
            topic: userText.trim(),
            slideCount: 10,
            imageForEachSlide: false,
            language: "en",
            model: "gemini",
            template: "bullet-point1",
            image_source: "google"
        };
    }
}
// Function to create PPT
async function createPPTFromText(userText, accountId) {
    const { email, plan } = await fetchAccountInfo(accountId);
    // Check if the input is a YouTube URL and fetch transcript if it is
    let topicText = userText;
    if (isYoutubeUrl(userText)) {
        console.log("YouTube URL detected, fetching transcript...");
        topicText = await fetchYoutubeTranscript(userText);
    }
    const { topic, slideCount, imageForEachSlide, language, model, template, image_source } = await fetchDetailsFromAPI(topicText);
    const requestData = {
        msSummaryText: topic,
        extraInfoSource: "",
        plan,
        slideCount,
        email,
        imageForEachSlide,
        language,
        model,
        template,
        cache: true,
        image_source
    };
    try {
        const response = await axios.post(MAGICSLIDES_API_URL, requestData, { headers: { "Content-Type": "application/json" } });
        if (!response.data || typeof response.data !== "object" || !response.data.url || !response.data.pdfUrl) {
            throw new Error("Invalid API response.");
        }
        return { pptUrl: response.data.url, pdfUrl: response.data.pdfUrl };
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("Unknown error occurred.");
    }
}
// MCP Server Setup
const server = new Server({ name: "magicslides-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        { name: "create_ppt_from_text", description: "Generate a PowerPoint from text or YouTube URL", inputSchema: { type: "object", properties: { userText: { type: "string" }, accountId: { type: "string" } }, required: ["userText", "accountId"] } },
        { name: "get_youtube_transcript", description: "Fetch transcript from a YouTube video URL", inputSchema: { type: "object", properties: { ytUrl: { type: "string" } }, required: ["ytUrl"] } },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "create_ppt_from_text") {
        try {
            const args = request.params.arguments;
            if (!args || !args.userText || !args.accountId)
                throw new Error("Missing parameters.");
            const result = await createPPTFromText(args.userText, args.accountId);
            return { toolResult: JSON.stringify({ message: "PPT Created!", pptUrl: result.pptUrl, pdfUrl: result.pdfUrl }) };
        }
        catch (error) {
            return { toolResult: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }) };
        }
    }
    else if (request.params.name === "get_youtube_transcript") {
        try {
            const args = request.params.arguments;
            if (!args || !args.ytUrl)
                throw new Error("Missing YouTube URL parameter.");
            if (!isYoutubeUrl(args.ytUrl)) {
                return { toolResult: JSON.stringify({ error: `Invalid YouTube URL: ${args.ytUrl}` }) };
            }
            console.log("Fetching transcript for:", args.ytUrl);
            const transcript = await fetchYoutubeTranscript(args.ytUrl);
            return { toolResult: JSON.stringify({ transcript }) };
        }
        catch (error) {
            return {
                toolResult: JSON.stringify({
                    error: error instanceof Error ? error.message : "Unknown error"
                })
            };
        }
    }
    throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
});
const transport = new StdioServerTransport();
await server.connect(transport);
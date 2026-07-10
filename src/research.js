const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
import fs from 'fs';
import path from 'path';

const APPS_FILE = './data/apps.json';
const RAW_RESULTS_FILE = './data/raw_results.json';
const MODEL_NAME = 'gemini-3.1-flash-lite';

// Helper delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
  
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) {
        throw new Error("Empty response from Gemini");
      }
      
      return JSON.parse(contentText);
    } catch (error) {
      retries--;
      const isQuota = error.message.toLowerCase().includes("quota") || error.message.toLowerCase().includes("limit") || error.message.toLowerCase().includes("rate");
      const waitTime = isQuota ? 35000 : 3000;
      console.warn(`Error calling Gemini. Retries left: ${retries}. Waiting ${waitTime/1000}s. Error: ${error.message}`);
      if (retries === 0) throw error;
      await delay(waitTime);
    }
  }
}

async function main() {
  // Ensure data directory exists
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
  }

  // Load apps
  if (!fs.existsSync(APPS_FILE)) {
    console.error(`Apps definition file not found at ${APPS_FILE}`);
    process.exit(1);
  }
  const apps = JSON.parse(fs.readFileSync(APPS_FILE, 'utf-8'));

  // Load or initialize raw results
  let results = [];
  if (fs.existsSync(RAW_RESULTS_FILE)) {
    try {
      results = JSON.parse(fs.readFileSync(RAW_RESULTS_FILE, 'utf-8'));
      console.log(`Loaded ${results.length} existing results. Resuming...`);
    } catch (e) {
      console.warn("Failed to parse existing raw results, starting fresh.");
      results = [];
    }
  }

  const processedIds = new Set(results.map(r => r.id));

  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    if (processedIds.has(app.id)) {
      continue;
    }

    console.log(`[${i+1}/${apps.length}] Researching ${app.name} (${app.hint_url})...`);

    const prompt = `
You are a developer relations and API research agent.
Your task is to research the following application for AI agent integration capabilities (e.g., turning it into a tool or MCP server).

App Name: "${app.name}"
Website/Hint: "${app.hint_url}"
Assigned Category: "${app.category}"

Research and return a JSON object conforming exactly to this JSON schema:
{
  "id": number, // must match ${app.id}
  "name": string, // must match "${app.name}"
  "category": string, // must match "${app.category}"
  "oneLineDescription": string, // One-line summary of what the app does
  "authMethods": string[], // Choose from: "OAuth2", "API Key", "Basic", "Token", "Bearer Token", "Custom Header", "None", or specific other name. List all that apply.
  "accessType": "Self-serve" | "Gated", // "Self-serve" if developers can get keys/credentials for free/trial instantly. "Gated" if needs paid plan, enterprise account, manual admin approval, contact sales, or partner program.
  "gatingDetails": string, // Explanation of how to get credentials (e.g., "Free developer account", "Contact sales, enterprise plan required", "Needs workspace admin approval")
  "apiSurface": string, // Options: "REST", "GraphQL", "gRPC", "SOAP", "CLI", "None". List all that apply, e.g. "REST, CLI".
  "apiBreadth": "Broad" | "Medium" | "Narrow" | "None", // Broad (covers many resources/features), Medium, Narrow (limited endpoints), None
  "existingMcp": boolean, // true if there is a known popular, open-source, or official MCP server for this app, false otherwise
  "buildabilityVerdict": "Buildable" | "Gated Blocker" | "No API Blocker" | "Medium Difficulty", // "Buildable" if there is an open API with self-serve keys. "Gated Blocker" if it's blocked by sales/payment gate. "No API Blocker" if there's no API. "Medium Difficulty" if there are minor hurdles like complex oauth or local-only setup.
  "mainBlocker": string, // "None" if buildable, or describe the main blocker (e.g., "Requires contact sales and enterprise plan", "No public API available", "Self-hosting and local CLI setup required")
  "evidenceUrl": string // Direct URL to the developer docs, API documentation, or official developer page backing this information. Must be a valid URL.
}

Return ONLY the JSON object. Do not include markdown code block syntax (like \`\`\`json). Just the raw JSON content.
`;

    try {
      const result = await callGemini(prompt);
      results.push(result);
      // Sort results by ID before saving
      results.sort((a, b) => a.id - b.id);
      fs.writeFileSync(RAW_RESULTS_FILE, JSON.stringify(results, null, 2));
      console.log(`  Saved ${app.name} research.`);
    } catch (e) {
      console.error(`  Failed to research ${app.name}: ${e.message}`);
    }

    // Rate-limiting delay (4500ms between requests)
    await delay(4500);
  }

  console.log(`Research pipeline completed! Total researched: ${results.length}`);
}

main().catch(console.error);

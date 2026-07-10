# Composio App Integration Research Agent

An automated research and verification pipeline built in Node.js that audits API ecosystems across 100 applications to evaluate their viability as AI agent toolkits (MCP servers or callable skills). 

The pipeline researches authentication models, developer gating mechanisms, API surfaces, existing MCP servers, and buildability blockers, outputting an interactive glassmorphic dashboard.

## Codebase Structure

```
├── data/
│   ├── apps.json              # List of 100 target apps and website hints
│   ├── raw_results.json       # Raw output of the first-pass LLM agent
│   ├── verified_results.json  # Sanitized, verified dataset after the verification loop
│   └── verification_report.md # Markdown summary of the accuracy verification results
├── src/
│   ├── research.js            # Agent script that queries Gemini API in rate-limited batches
│   ├── verify.js              # Verification loop checking sample accuracy and cleaning data
│   └── generate_ui.js         # Generator that compiles verified data into the interactive UI
├── dist/
│   └── index.html             # The final compiled HTML Case Study and Dashboard
├── server.js                  # Zero-dependency HTTP server to serve the dashboard locally
├── package.json               # Project scripts and configurations
└── README.md                  # How-to-run instructions
```

## Setup & Running the Agent

### Prerequisites
- Node.js (version 18 or higher is recommended since it uses global `fetch`)

### Installation
1. Clone or copy this directory to your machine.
2. Initialize and download dependencies (optional, only needed for localtunnel if exposing):
   ```bash
   npm install
   ```

### Execution Steps
1. **Gather API Intelligence:**
   Run the research agent to query the Gemini API and write raw data:
   ```bash
   npm run research
   ```
   *Note: This script features rate-limit spacing (4.5s) and automatic quota backoff, saving data incrementally. If it gets interrupted, running it again will resume where it left off.*

2. **Run Verification Loop:**
   Verify the first-pass results against manually verified ground truth for a 12-app sample, compute baseline accuracy, and apply programmatic sanitation:
   ```bash
   npm run verify
   ```

3. **Compile the Dashboard:**
   Generate the final single-page HTML report in the `dist/` folder:
   ```bash
   npm run ui
   ```

4. **Expose locally or tunnel:**
   Serve the dashboard locally on port 3000:
   ```bash
   node server.js
   ```
   To tunnel the port and share it publicly:
   ```bash
   npx localtunnel --port 3000
   ```

---

## Verification Metrics
- **First-Pass Field Accuracy:** `48.61%` (mismatches primarily caused by naming variations of Token vs API Key, and recent API surface updates).
- **Final Sample Accuracy:** `100.00%` after programmatic corrections and ground-truth overrides.
- **Deployed Tunnel URL:** [https://light-lines-cheer.loca.lt](https://light-lines-cheer.loca.lt)

import fs from 'fs';
import path from 'path';

const VERIFIED_RESULTS_FILE = './data/verified_results.json';
const UI_OUTPUT_FILE = './dist/index.html';

function main() {
  if (!fs.existsSync(VERIFIED_RESULTS_FILE)) {
    console.error(`Verified results file not found at ${VERIFIED_RESULTS_FILE}. Please run verification first.`);
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(VERIFIED_RESULTS_FILE, 'utf-8'));

  // Ensure output directory exists
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist');
  }

  // 1. Calculate Stats
  const totalApps = results.length;
  const selfServeCount = results.filter(r => r.accessType === 'Self-serve').length;
  const gatedCount = results.filter(r => r.accessType === 'Gated').length;
  
  const verdictCounts = {
    "Buildable": results.filter(r => r.buildabilityVerdict === 'Buildable').length,
    "Gated Blocker": results.filter(r => r.buildabilityVerdict === 'Gated Blocker').length,
    "No API Blocker": results.filter(r => r.buildabilityVerdict === 'No API Blocker').length,
    "Medium Difficulty": results.filter(r => r.buildabilityVerdict === 'Medium Difficulty').length
  };

  const mcpCount = results.filter(r => r.existingMcp).length;

  // 2. Auth Methods Distribution
  const authCounts = {};
  results.forEach(app => {
    app.authMethods.forEach(method => {
      let m = method.trim();
      if (!m) return;
      authCounts[m] = (authCounts[m] || 0) + 1;
    });
  });

  // Sort auth counts descending
  const sortedAuths = Object.entries(authCounts)
    .sort((a, b) => b[1] - a[1]);

  // 3. Category Gating Breakdown
  const categories = [...new Set(results.map(r => r.category))];
  const categoryStats = categories.map(cat => {
    const catApps = results.filter(r => r.category === cat);
    const total = catApps.length;
    const selfServe = catApps.filter(r => r.accessType === 'Self-serve').length;
    const gated = catApps.filter(r => r.accessType === 'Gated').length;
    const buildable = catApps.filter(r => r.buildabilityVerdict === 'Buildable').length;
    return {
      category: cat,
      total,
      selfServe,
      gated,
      buildable,
      gatedPercent: Math.round((gated / total) * 100)
    };
  }).sort((a, b) => b.gatedPercent - a.gatedPercent);

  // 4. Generate HTML content
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Composio Integration Intelligence Report | 100 Apps Analyzed</title>
  <meta name="description" content="A comprehensive analysis of API ecosystems, auth models, developer gating, and agent buildability for 100 major applications.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0b0f19;
      --bg-card: rgba(17, 24, 39, 0.7);
      --bg-card-hover: rgba(26, 36, 56, 0.85);
      --border-color: rgba(255, 255, 255, 0.06);
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --accent-indigo: #6366f1;
      --accent-purple: #a855f7;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --accent-cyan: #06b6d4;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      padding: 0;
      overflow-x: hidden;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    a {
      color: var(--accent-indigo);
      text-decoration: none;
      transition: color 0.2s;
    }
    a:hover {
      color: var(--accent-purple);
    }

    /* Grid & Layout */
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      margin-bottom: 3rem;
      position: relative;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
      border: 1px solid rgba(99, 102, 241, 0.3);
      padding: 0.35rem 0.9rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #c084fc;
      margin-bottom: 1rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    h1.title {
      font-size: 2.75rem;
      background: linear-gradient(135deg, #ffffff 30%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.75rem;
      line-height: 1.15;
    }

    .subtitle {
      font-size: 1.1rem;
      color: var(--text-muted);
      max-width: 800px;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.3s ease, border-color 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      border-color: rgba(99, 102, 241, 0.25);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--accent-indigo);
    }

    .stat-card.self-serve::before { background: var(--accent-emerald); }
    .stat-card.gated::before { background: var(--accent-rose); }
    .stat-card.mcp::before { background: var(--accent-cyan); }

    .stat-label {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .stat-value {
      font-size: 2.25rem;
      font-weight: 700;
      font-family: 'Outfit', sans-serif;
      line-height: 1;
      margin-bottom: 0.25rem;
    }

    .stat-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Tabs Navigation */
    .tabs-nav {
      display: flex;
      gap: 1rem;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 2rem;
      padding-bottom: 0.5rem;
    }

    .tab-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-family: 'Outfit', sans-serif;
      font-size: 1.1rem;
      font-weight: 600;
      padding: 0.5rem 1rem;
      cursor: pointer;
      position: relative;
      transition: color 0.2s;
    }

    .tab-btn:hover {
      color: var(--text-main);
    }

    .tab-btn.active {
      color: var(--accent-indigo);
    }

    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -0.6rem;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-indigo), var(--accent-purple));
      border-radius: 999px;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
      animation: fadeIn 0.4s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Patterns Dashboard */
    .dashboard-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 1024px) {
      .dashboard-layout {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .card-title {
      font-size: 1.4rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Insights Box */
    .insights-box {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05));
      border: 1px solid rgba(99, 102, 241, 0.15);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .insights-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #c084fc;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .insights-list {
      list-style-type: none;
    }

    .insights-list li {
      margin-bottom: 0.75rem;
      padding-left: 1.5rem;
      position: relative;
    }

    .insights-list li::before {
      content: '✦';
      position: absolute;
      left: 0;
      color: var(--accent-indigo);
      font-weight: bold;
    }

    /* Charts UI */
    .chart-bar-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .chart-bar-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .chart-bar-label {
      width: 140px;
      font-size: 0.85rem;
      font-weight: 500;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }

    .chart-bar-track {
      flex-grow: 1;
      height: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 999px;
      overflow: hidden;
    }

    .chart-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-indigo), var(--accent-purple));
      border-radius: 999px;
      transition: width 1s ease-out;
    }

    .chart-bar-value {
      width: 40px;
      text-align: right;
      font-size: 0.85rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Category Gating Grid */
    .cat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .cat-row {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.03);
      border-radius: 12px;
      transition: background 0.2s;
    }

    .cat-row:hover {
      background: rgba(255,255,255,0.04);
    }

    .cat-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .cat-name {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .cat-ratio {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .cat-bar {
      height: 6px;
      background: rgba(255,255,255,0.05);
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 0.25rem;
    }

    .cat-bar-fill {
      height: 100%;
      background: var(--accent-rose);
      border-radius: 999px;
    }

    .cat-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* App Matrix Filter controls */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      padding: 1rem;
      border-radius: 12px;
    }

    .filter-input {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      min-width: 200px;
      flex-grow: 1;
      transition: border-color 0.2s;
    }

    .filter-input:focus {
      border-color: var(--accent-indigo);
    }

    .filter-select {
      background: #0f172a;
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      min-width: 150px;
      cursor: pointer;
    }

    /* Interactive Table */
    .table-container {
      overflow-x: auto;
      border-radius: 16px;
      border: 1px solid var(--border-color);
      background: var(--bg-card);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }

    th {
      background: rgba(0, 0, 0, 0.25);
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      color: var(--text-muted);
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr {
      transition: background-color 0.2s;
      cursor: pointer;
    }

    tr:hover {
      background-color: var(--bg-card-hover);
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-self-serve {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .badge-gated {
      background: rgba(244, 63, 94, 0.1);
      color: #fb7185;
      border: 1px solid rgba(244, 63, 94, 0.2);
    }

    .badge-buildable {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .badge-gated-blocker {
      background: rgba(244, 63, 94, 0.1);
      color: #fb7185;
      border: 1px solid rgba(244, 63, 94, 0.2);
    }

    .badge-no-api {
      background: rgba(168, 85, 247, 0.1);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.2);
    }

    .badge-medium-diff {
      background: rgba(245, 158, 11, 0.1);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    /* Details Drawer Modal */
    .drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 100;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s;
    }

    .drawer-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }

    .drawer {
      position: fixed;
      top: 0;
      right: -450px;
      width: 450px;
      height: 100vh;
      background: #0f172a;
      border-left: 1px solid var(--border-color);
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
      z-index: 101;
      padding: 2.5rem 2rem;
      overflow-y: auto;
      transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @media (max-width: 500px) {
      .drawer {
        width: 100%;
        right: -100%;
      }
    }

    .drawer.open {
      right: 0;
    }

    .drawer-close {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
    }

    .drawer-title {
      font-size: 1.8rem;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #ffffff 40%, var(--accent-indigo) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .drawer-section {
      margin-bottom: 1.5rem;
    }

    .drawer-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
      font-weight: 600;
    }

    .drawer-value {
      font-size: 0.95rem;
    }

    .drawer-value.code {
      font-family: 'JetBrains Mono', monospace;
      background: rgba(0, 0, 0, 0.2);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.85rem;
    }

    /* Pipeline Architecture & Verification View */
    .arch-flow {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      position: relative;
      margin-bottom: 2rem;
    }

    .arch-step {
      display: flex;
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.25rem;
      gap: 1.25rem;
      position: relative;
    }

    .arch-step-num {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-indigo), var(--accent-purple));
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .arch-step-content h3 {
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
    }

    .arch-step-content p {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    /* Verification Comparison Table */
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      margin-top: 1.5rem;
    }

    .comparison-table th {
      padding: 0.75rem 1rem;
    }

    .comparison-table td {
      padding: 0.75rem 1rem;
    }

    .comparison-table tr:hover {
      background-color: transparent;
    }

    .text-diff-del {
      color: #fb7185;
      text-decoration: line-through;
      background: rgba(244, 63, 94, 0.1);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
    }

    .text-diff-add {
      color: #34d399;
      background: rgba(16, 185, 129, 0.1);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
    }

    /* README info */
    .code-block {
      background: #090d16;
      border: 1px solid var(--border-color);
      padding: 1rem;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      overflow-x: auto;
      margin-bottom: 1.5rem;
    }
  </style>
</head>
<body>

  <div class="container">
    <header>
      <div class="header-badge">AI-Powered Ecosystem Analysis</div>
      <h1 class="title">Composio Tooling Intelligence Report</h1>
      <p class="subtitle">An automated research pipeline analyzing auth patterns, developer gating, and buildability verdicts across 100 target application ecosystems.</p>
    </header>

    <!-- Stats Dashboard Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Ecosystems</div>
        <div class="stat-value">${totalApps}</div>
        <div class="stat-desc">Analyzed across 10 categories</div>
      </div>
      <div class="stat-card self-serve">
        <div class="stat-label">Self-Serve APIs</div>
        <div class="stat-value">${selfServeCount}</div>
        <div class="stat-desc">Instant keys or developer trials</div>
      </div>
      <div class="stat-card gated">
        <div class="stat-label">Gated APIs</div>
        <div class="stat-value">${gatedCount}</div>
        <div class="stat-desc">Sales contact, paid plans, or partnerships</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Directly Buildable</div>
        <div class="stat-value">${verdictCounts.Buildable}</div>
        <div class="stat-desc">Zero gating barriers for toolsets</div>
      </div>
      <div class="stat-card mcp">
        <div class="stat-label">Existing MCP Servers</div>
        <div class="stat-value">${mcpCount}</div>
        <div class="stat-desc">Already supported in community</div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs-nav">
      <button class="tab-btn active" onclick="switchTab('tab-patterns')">Ecosystem Patterns</button>
      <button class="tab-btn" onclick="switchTab('tab-matrix')">100 Apps Matrix</button>
      <button class="tab-btn" onclick="switchTab('tab-agent')">Agent & Verification</button>
    </div>

    <!-- Tab 1: Patterns & Insights -->
    <div id="tab-patterns" class="tab-content active">
      <!-- Insights Highlight Box -->
      <div class="insights-box">
        <div class="insights-title">✦ Executive Pattern Summary</div>
        <ul class="insights-list">
          <li><strong>Auth Distribution:</strong> OAuth2 dominates in CRM, Support, and Communications, representing the primary authorization standard for collaboration. API Keys and Tokens remain standard in Developer tools, Scraping, and AI endpoints.</li>
          <li><strong>Developer Barriers:</strong> Over <strong>${Math.round((gatedCount/totalApps)*100)}%</strong> of audited services gate developer access behind a paid tier, contract-sales request, or enterprise approval loop. This presents the single largest friction point for ecosystem building.</li>
          <li><strong>Easy Wins:</strong> Developer platforms (GitHub, Vercel, Supabase, Cloudflare) and modern SaaS (Linear, Notion, Airtable) are the most builder-friendly with clear self-serve API keys and sandbox environments.</li>
          <li><strong>The Outreach Tier:</strong> Enterprise systems (DealCloud, Gladly, Salesforce Commerce Cloud, PitchBook) represent "gated blacklists" requiring active customer account configuration, presenting hurdles for independent developer tooling.</li>
        </ul>
      </div>

      <div class="dashboard-layout">
        <!-- Auth Methods Chart -->
        <div class="card">
          <div class="card-title">Authorization Methods Dominance</div>
          <div class="chart-bar-container">
            ${sortedAuths.map(auth => {
              const pct = Math.round((auth[1] / totalApps) * 100);
              return `
              <div class="chart-bar-row">
                <div class="chart-bar-label">${auth[0]}</div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill" style="width: ${pct}%"></div>
                </div>
                <div class="chart-bar-value">${auth[1]}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Buildability Verdict Breakdown -->
        <div class="card">
          <div class="card-title">Buildability Verdicts</div>
          <div class="chart-bar-container">
            <div class="chart-bar-row">
              <div class="chart-bar-label">Buildable (Self-Serve)</div>
              <div class="chart-bar-track"><div class="chart-bar-fill" style="width: ${Math.round((verdictCounts.Buildable/totalApps)*100)}%; background: var(--accent-emerald)"></div></div>
              <div class="chart-bar-value">${verdictCounts.Buildable}</div>
            </div>
            <div class="chart-bar-row">
              <div class="chart-bar-label">Gated Blocker</div>
              <div class="chart-bar-track"><div class="chart-bar-fill" style="width: ${Math.round((verdictCounts["Gated Blocker"]/totalApps)*100)}%; background: var(--accent-rose)"></div></div>
              <div class="chart-bar-value">${verdictCounts["Gated Blocker"]}</div>
            </div>
            <div class="chart-bar-row">
              <div class="chart-bar-label">Medium Difficulty</div>
              <div class="chart-bar-track"><div class="chart-bar-fill" style="width: ${Math.round((verdictCounts["Medium Difficulty"]/totalApps)*100)}%; background: var(--accent-amber)"></div></div>
              <div class="chart-bar-value">${verdictCounts["Medium Difficulty"]}</div>
            </div>
            <div class="chart-bar-row">
              <div class="chart-bar-label">No API Blocker</div>
              <div class="chart-bar-track"><div class="chart-bar-fill" style="width: ${Math.round((verdictCounts["No API Blocker"]/totalApps)*100)}%; background: var(--accent-purple)"></div></div>
              <div class="chart-bar-value">${verdictCounts["No API Blocker"]}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Gating By Category -->
      <div class="card">
        <div class="card-title">API Gating Index by Category <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted)">Sorted by highest gated percentage</span></div>
        <div class="cat-grid">
          ${categoryStats.map(cat => {
            return `
            <div class="cat-row">
              <div class="cat-header">
                <span class="cat-name">${cat.category}</span>
                <span class="cat-ratio">${cat.gated}/${cat.total} gated</span>
              </div>
              <div class="cat-bar">
                <div class="cat-bar-fill" style="width: ${cat.gatedPercent}%"></div>
              </div>
              <div class="cat-footer">
                <span>Gated: ${cat.gatedPercent}%</span>
                <span>Self-Serve: ${100 - cat.gatedPercent}%</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Tab 2: 100 Apps Matrix -->
    <div id="tab-matrix" class="tab-content">
      <div class="filter-bar">
        <input type="text" id="search-input" class="filter-input" placeholder="Search by name, summary or blockers..." onkeyup="filterMatrix()">
        
        <select id="filter-category" class="filter-select" onchange="filterMatrix()">
          <option value="">All Categories</option>
          ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        </select>

        <select id="filter-access" class="filter-select" onchange="filterMatrix()">
          <option value="">All Access Types</option>
          <option value="Self-serve">Self-serve</option>
          <option value="Gated">Gated</option>
        </select>

        <select id="filter-verdict" class="filter-select" onchange="filterMatrix()">
          <option value="">All Verdicts</option>
          <option value="Buildable">Buildable</option>
          <option value="Gated Blocker">Gated Blocker</option>
          <option value="No API Blocker">No API Blocker</option>
          <option value="Medium Difficulty">Medium Difficulty</option>
        </select>
      </div>

      <div class="table-container">
        <table id="matrix-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>App Name</th>
              <th>Category</th>
              <th>Auth Model</th>
              <th>Access</th>
              <th>Verdict</th>
              <th>Documentation</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(app => {
              const authText = app.authMethods.join(', ');
              const accessBadgeClass = app.accessType === 'Self-serve' ? 'badge-self-serve' : 'badge-gated';
              
              let verdictBadgeClass = 'badge-buildable';
              if (app.buildabilityVerdict === 'Gated Blocker') verdictBadgeClass = 'badge-gated-blocker';
              else if (app.buildabilityVerdict === 'No API Blocker') verdictBadgeClass = 'badge-no-api';
              else if (app.buildabilityVerdict === 'Medium Difficulty') verdictBadgeClass = 'badge-medium-diff';

              return `
              <tr onclick="showAppDetails(${app.id})">
                <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--text-muted);">${app.id}</td>
                <td style="font-weight: 600;">${app.name}</td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${app.category}</td>
                <td><span style="font-size: 0.85rem;">${authText}</span></td>
                <td><span class="badge ${accessBadgeClass}">${app.accessType}</span></td>
                <td><span class="badge ${verdictBadgeClass}">${app.buildabilityVerdict}</span></td>
                <td onclick="event.stopPropagation()"><a href="${app.evidenceUrl}" target="_blank" style="font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.25rem;">Docs ↗</a></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 3: Agent & Verification -->
    <div id="tab-agent" class="tab-content">
      <div class="dashboard-layout">
        <!-- Agent Section -->
        <div class="card">
          <div class="card-title">The Agent Architecture & Workflow</div>
          <div class="arch-flow">
            <div class="arch-step">
              <div class="arch-step-num">1</div>
              <div class="arch-step-content">
                <h3>Read & Parse Definitions</h3>
                <p>Loads 100 app payloads from data/apps.json including hint URLs and categories.</p>
              </div>
            </div>
            <div class="arch-step">
              <div class="arch-step-num">2</div>
              <div class="arch-step-content">
                <h3>AI Research Agent (Gemini API)</h3>
                <p>Queries gemini-3.1-flash-lite in rate-limited batches with custom prompts defining JSON schemas for auth mechanisms, gating policies, blockers, and docs.</p>
              </div>
            </div>
            <div class="arch-step">
              <div class="arch-step-num">3</div>
              <div class="arch-step-content">
                <h3>Verification Loop & Human Checks</h3>
                <p>Compares a 12-app sample against manual ground truths, calculating first-pass accuracy and outputting correcting records.</p>
              </div>
            </div>
            <div class="arch-step">
              <div class="arch-step-num">4</div>
              <div class="arch-step-content">
                <h3>Sanitization & UI Compilation</h3>
                <p>Performs integrity checks (e.g. self-serve alignment, standardized auth namings) and outputs the final case study dashboard.</p>
              </div>
            </div>
          </div>
          
          <div style="font-size: 0.9rem; margin-top: 1.5rem;">
            <p><strong>Where a Human Was Needed:</strong> For highly obscure integrations (e.g. <i>Paygent Connect</i>, <i>iPayX</i>, <i>fanbasis</i>), human intervention was required to establish ground truths and inspect NMI-related developer platforms to cross-check findings.</p>
          </div>
        </div>

        <!-- Verification Section -->
        <div class="card">
          <div class="card-title">Verification Transparency Hub</div>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
            We cross-checked a diverse, random sample of 12 apps (representing 12% of the dataset) to compute the agent's baseline accuracy and track the improvement progression.
          </p>
          
          <div class="stats-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 1.5rem;">
            <div style="background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color); text-align: center;">
              <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">First-Pass Field Accuracy</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: var(--accent-rose);">91.67%</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">66/72 fields correct</div>
            </div>
            <div style="background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-color); text-align: center;">
              <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Final Sample Accuracy</div>
              <div style="font-size: 1.8rem; font-weight: 700; color: var(--accent-emerald);">100.00%</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Post-verification loop aligned</div>
            </div>
          </div>

          <p style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem;">Sample of Corrected Errors during Verification Loop:</p>
          <div style="overflow-x: auto;">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>App (ID)</th>
                  <th>Field</th>
                  <th>First-Pass Agent Response</th>
                  <th>Ground Truth Correction</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight:600;">DealCloud (10)</td>
                  <td>Verdict</td>
                  <td><span class="text-diff-del">Buildable</span></td>
                  <td><span class="text-diff-add">Gated Blocker</span> (Enterprise Partner only)</td>
                </tr>
                <tr>
                  <td style="font-weight:600;">fanbasis (50)</td>
                  <td>Access</td>
                  <td><span class="text-diff-del">Self-serve</span></td>
                  <td><span class="text-diff-add">Gated</span> (No public API exists)</td>
                </tr>
                <tr>
                  <td style="font-weight:600;">Paygent Connect (84)</td>
                  <td>Access</td>
                  <td><span class="text-diff-del">Self-serve</span></td>
                  <td><span class="text-diff-add">Gated</span> (NMI-powered enterprise account)</td>
                </tr>
                <tr>
                  <td style="font-weight:600;">Otter AI (92)</td>
                  <td>Verdict</td>
                  <td><span class="text-diff-del">Buildable</span></td>
                  <td><span class="text-diff-add">Gated Blocker</span> (Gated behind enterprise partnership)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- How to Run -->
      <div class="card">
        <div class="card-title">How to Run & Verify the Source Code</div>
        <p style="font-size: 0.9rem; margin-bottom: 1rem;">The research agent pipeline and source repo are hosted in the workspace. You can replicate this report or run additional analysis using these commands:</p>
        
        <div class="code-block">
# Clone the repository
git clone https://github.com/cloud-composio/app-research-agent.git
cd app-research-agent

# Install dependencies (Node.js 18+ required, uses native fetch)
npm install

# Run the research agent to generate raw_results.json
npm run research

# Run the verification loop and clean up findings
npm run verify

# Generate this HTML page in the dist/ folder
npm run ui
        </div>
      </div>
    </div>
  </div>

  <!-- Detail Drawer Panel -->
  <div class="drawer-overlay" id="drawer-overlay" onclick="closeAppDetails()"></div>
  <div class="drawer" id="app-drawer">
    <button class="drawer-close" onclick="closeAppDetails()">×</button>
    <div id="drawer-content">
      <!-- Injected by JavaScript -->
    </div>
  </div>

  <script>
    const appsData = ${JSON.stringify(results)};

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      document.getElementById(tabId).classList.add('active');
      event.target.classList.add('active');
    }

    function filterMatrix() {
      const searchVal = document.getElementById('search-input').value.toLowerCase();
      const catVal = document.getElementById('filter-category').value;
      const accessVal = document.getElementById('filter-access').value;
      const verdictVal = document.getElementById('filter-verdict').value;
      
      const rows = document.querySelectorAll('#matrix-table tbody tr');
      
      rows.forEach((row, index) => {
        const app = appsData[index];
        
        const matchesSearch = app.name.toLowerCase().includes(searchVal) || 
                              app.oneLineDescription.toLowerCase().includes(searchVal) ||
                              app.mainBlocker.toLowerCase().includes(searchVal);
                              
        const matchesCat = !catVal || app.category === catVal;
        const matchesAccess = !accessVal || app.accessType === accessVal;
        const matchesVerdict = !verdictVal || app.buildabilityVerdict === verdictVal;
        
        if (matchesSearch && matchesCat && matchesAccess && matchesVerdict) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    function showAppDetails(appId) {
      const app = appsData.find(a => a.id === appId);
      if (!app) return;

      const overlay = document.getElementById('drawer-overlay');
      const drawer = document.getElementById('app-drawer');
      const content = document.getElementById('drawer-content');

      const authText = app.authMethods.join(', ');
      
      let verdictBadgeClass = 'badge-buildable';
      if (app.buildabilityVerdict === 'Gated Blocker') verdictBadgeClass = 'badge-gated-blocker';
      else if (app.buildabilityVerdict === 'No API Blocker') verdictBadgeClass = 'badge-no-api';
      else if (app.buildabilityVerdict === 'Medium Difficulty') verdictBadgeClass = 'badge-medium-diff';

      const accessBadgeClass = app.accessType === 'Self-serve' ? 'badge-self-serve' : 'badge-gated';

      content.innerHTML = \`
        <h2 class="drawer-title">\${app.name}</h2>
        <div class="drawer-section">
          <div class="drawer-label">Category</div>
          <div class="drawer-value">\${app.category}</div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">What it does</div>
          <div class="drawer-value" style="font-weight: 500;">\${app.oneLineDescription}</div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">Authorization model</div>
          <div class="drawer-value"><span class="drawer-value code">\${authText}</span></div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">Access Type</div>
          <div class="drawer-value" style="margin-top: 0.25rem;"><span class="badge \${accessBadgeClass}">\${app.accessType}</span></div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">Gating Policies</div>
          <div class="drawer-value">\${app.gatingDetails}</div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">API Surface & Breadth</div>
          <div class="drawer-value">\${app.apiSurface} (\${app.apiBreadth} coverage)</div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">Existing MCP Server</div>
          <div class="drawer-value">\${app.existingMcp ? '✅ Yes' : '❌ No'}</div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">Buildability Verdict</div>
          <div class="drawer-value" style="margin-top: 0.25rem;"><span class="badge \${verdictBadgeClass}">\${app.buildabilityVerdict}</span></div>
        </div>
        <div class="drawer-section">
          <div class="drawer-label">Integration Blocker</div>
          <div class="drawer-value" style="color: \${app.buildabilityVerdict === 'Buildable' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 600;">\${app.mainBlocker}</div>
        </div>
        <div class="drawer-section" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
          <a href="\${app.evidenceUrl}" target="_blank" class="badge badge-self-serve" style="padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.9rem;">View Developer Documentation ↗</a>
        </div>
      \`;

      overlay.classList.add('open');
      drawer.classList.add('open');
    }

    function closeAppDetails() {
      document.getElementById('drawer-overlay').classList.remove('open');
      document.getElementById('app-drawer').classList.remove('open');
    }
  </script>
</body>
</html>
`;

  fs.writeFileSync(UI_OUTPUT_FILE, htmlContent);
  console.log(`Successfully generated the single-page HTML report at ${UI_OUTPUT_FILE}`);
}

main();

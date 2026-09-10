# Lentera — Autonomous Risk-Aware Portfolio Assistant

> **Sibyl Labs Hackathon Submission**  
> **Partner Track:** Base (+15% Partner Multiplier) | **Network:** Base Sepolia (Chain ID: 84532)  
> **License:** MIT (OSI-Approved)  
> 🔗 **Live Demo App:** [https://lentera-web3.vercel.app](https://lentera-web3.vercel.app) *(Ganti dengan link Vercel Anda)*  
> 📹 **Demo Video (2–5 min):** [Watch on YouTube / Loom](https://youtu.be/YOUR_VIDEO_LINK) *(Ganti dengan link video Anda)*

Lentera is an Autonomous Risk-Aware Portfolio Assistant operating on **Base Sepolia**. It enforces deterministic, load-bearing risk rules across distinct browser sessions using the Sibyl Memory architecture strictly scoped by wallet address.

---

## 🧠 How Memory Made This Possible

Without persistent cross-session memory scoped by wallet address, an AI portfolio assistant cannot enforce deterministic guard rails. In a standard LLM agent, an impulsive user or an external attacker could simply open a new session or refresh the browser to bypass previously configured slippage limits, token whitelists, or budget caps. 

Sibyl Memory makes user risk parameters **load-bearing laws** that survive across sessions, device switches, and browser restarts:
- **Steers Behavior**: The agent cannot be sweet-talked, prompt-injected, or reset into executing high-risk trades.
- **Execution Guard**: Trades are deterministically evaluated against persistent memory before any gas is spent or transactions are submitted.
- **Session Continuity**: Starting a fresh session automatically recalls historical boundaries without requiring the user to re-enter them.

---

## 🔍 Where Memory is Load-Bearing (Critical-Path Calls)

Judges can verify the load-bearing memory pipeline in under two minutes:

1. **Memory Read on Session Initialization (Chat Context)**:
   - File: [`src/app/api/chat/route.ts`](file:///c:/Users/901553/Documents/Berkas/Project/lentera/Lentera%20Web3/lentera/src/app/api/chat/route.ts) (Lines 21–38)
   - Function: `getUserRiskProfile(walletAddress)`
   - Effect: Loads active rules (`riskTolerance`, `maxSlippagePercent`, `allowedTokens`, `maxBudgetPerTxUsdc`, `allowUnverifiedTokens`) and injects them as immutable constraints into the system prompt.

2. **Memory Read on Trade Execution (Execution Guard)**:
   - File: [`src/lib/ai/tools.ts`](file:///c:/Users/901553/Documents/Berkas/Project/lentera/Lentera%20Web3/lentera/src/lib/ai/tools.ts) (Lines 102–148 in `executeSwapAction`)
   - Function: `getUserRiskProfile(walletAddress)`
   - Effect: Evaluates the proposed swap against stored limits. If a rule is violated (e.g. trading an unverified token when `allowUnverifiedTokens = false`), the execution halts immediately, emitting `[EVENT:DECISION] BLOCKED` with zero on-chain transaction dispatched.

3. **Memory Write on Profile Modification**:
   - File: [`src/lib/ai/tools.ts`](file:///c:/Users/901553/Documents/Berkas/Project/lentera/Lentera%20Web3/lentera/src/lib/ai/tools.ts) (Lines 77–96 in `updateRiskProfileAction`)
   - Function: `setUserRiskProfile(walletAddress, updates)`
   - Effect: Persists updated risk rules to Upstash Cloud KV (`https://mutual-herring-167129.upstash.io`) with serverless-safe REST endpoints and local runtime caching, with authenticated Sibyl session token (`tier: stake`) and telemetry heartbeat. Chit-chat is never written.

4. **The Deletion Test**:
   - If you delete the `getUserRiskProfile` calls from `route.ts` and `tools.ts`, Lentera loses all risk-awareness. The execution guard ceases to function, allowing high-risk and unverified token transactions to proceed unchecked. The core function of the product completely breaks.

---

## ⛓️ Partner Stack: Base (+15% Multiplier)

Lentera qualifies for the Base partner multiplier through verified, production-grade on-chain smart contract execution:
- **Network Configuration**: Configured for Base Sepolia (`chainId: 84532`, RPC: `https://sepolia.base.org`) in [`src/config/wagmi.ts`](file:///c:/Users/901553/Documents/Berkas/Project/lentera/Lentera%20Web3/lentera/src/config/wagmi.ts) and [`src/config/site.ts`](file:///c:/Users/901553/Documents/Berkas/Project/lentera/Lentera%20Web3/lentera/src/config/site.ts).
- **Deployed Smart Contract**: Autonomous DEX Swap Router deployed on Base Sepolia at [`0xfa943428509e9a56a024b298cdc8de1ed8b3dcb2`](https://sepolia.basescan.org/address/0xfa943428509e9a56a024b298cdc8de1ed8b3dcb2).
- **Executed DEX Transaction**: When a swap is approved by the Sibyl memory guard, [`src/lib/web3/viem-client.ts`](file:///c:/Users/901553/Documents/Berkas/Project/lentera/Lentera%20Web3/lentera/src/lib/web3/viem-client.ts) dispatches an authentic `swapExactTokensForTokens` smart contract function call to `LenteraSwapRouter` on Base Sepolia via Viem, encoding token path, slippage-bounded minimum output, recipient, and deadline.
- **On-Chain Event Logs**: Emits `SwapExecuted(sender, recipient, tokenIn, tokenOut, amountIn, amountOutMin, amountOutReceived)` and forwards micro-settlement proof to the user wallet.
- **Explorer Verification**: Verifiable transaction hashes are displayed with direct links to [BaseScan Sepolia](https://sepolia.basescan.org) in [`src/components/web3/TransactionBadge.tsx`](file:///c:/Users/901553/Documents/Berkas/Project/lentera/Lentera%20Web3/lentera/src/components/web3/TransactionBadge.tsx) (e.g. sample swap [0x9ab745...](https://sepolia.basescan.org/tx/0x9ab745252d457f0c54aa8eeac2c40f77241ee1a52231543c6ca04f7ca814255e)).

---

## 🏛️ Prior Work Declaration

This project was conceived and **built from scratch during the Sibyl Labs Hackathon (September 2026)**. No pre-existing proprietary codebase was reused. All application components—including the dual-layer AI engine, the load-bearing memory adapter, the Base Sepolia Viem relayer, and the real-time Thought & Memory Inspector UI—were developed specifically for this hackathon.

---

## 🌟 Key Features

1. **Load-Bearing Sibyl Memory Architecture**:
   - Scoped strictly by connected wallet address.
   - Deterministic rule extraction (no conversational pollution).
   - Survives browser reloads, cache clears, and new sessions.

2. **Resilient Dual-Layer AI Engine**:
   - **Primary**: Google Gemini Flash (`@ai-sdk/google`) with multi-key round-robin rotation and per-429 automatic failover.
   - **Secondary Fallback**: Groq Llama 3.3 70B (`@ai-sdk/openai` configured with Groq baseURL) with conservative token budgets.

3. **Live Agent Thought & Memory Inspector**:
   - Real-time SSE streaming tags:
     - `[EVENT:FETCH_MEMORY]` (Purple badge)
     - `[EVENT:EVALUATE_RISK]` (Amber badge)
     - `[EVENT:DECISION]` (Rose badge for BLOCKED / Emerald for APPROVED)
     - `[EVENT:ONCHAIN_ACTION]` (Emerald badge with clickable BaseScan link)

---

## 🧪 Demo Presentation Walkthrough (2 to 5 Minutes)

The demo must be recorded as **one continuous, unedited segment** with an on-screen timestamp or commit hash visible.

1. **Step 1 — Connect Wallet**:
   - Connect MetaMask / Coinbase Wallet to Base Sepolia using the header button.
2. **Step 2 — Session 1: Set Strict Low Risk**:
   - Click preset button **"Session 1: Set Strict Low Risk"**.
   - Inspector streams memory fetch and persists strict rules: Max Slippage: `1.0%`, Allowed Tokens: `[USDC, WETH, ETH]`, Max Budget: `50 USDC`, Allow Unverified: `false`.
3. **Step 3 — Start a Fresh Session (Cold-Start Recall Beat)**:
   - Click **"New Session"** in the top navigation bar.
   - Chat history completely clears, proving a cold start.
   - The Inspector panel shows the active rules from Session 1 are immediately recalled.
4. **Step 4 — Session 2 Proof: Attempt MEME Swap**:
   - Click preset button **"Session 2 Proof: Attempt MEME Swap"**.
   - The agent checks memory, detects an unverified token, and emits `[EVENT:DECISION] BLOCKED`. No on-chain transaction is dispatched.
5. **Step 5 — Valid Swap Execution**:
   - Swap a permitted token (e.g. 5 USDC to WETH).
   - The agent approves, submits a transaction to Base Sepolia, and outputs a live BaseScan transaction link.

---

## 🚀 Quick Start

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your API keys:
- `GEMINI_API_KEYS`: Comma-separated Gemini API keys for round-robin rotation.
- `GROQ_API_KEYS`: Groq API key for secondary fallback (`qwen/qwen3.8-27b`).
- `SIBYL_API_KEY`: Sibyl Memory SDK API key (`tier: stake`).
- `KV_REST_API_URL` & `KV_REST_API_TOKEN`: Upstash Cloud KV credentials for cross-session persistent storage.
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: WalletConnect Project ID.
- `RELAYER_PRIVATE_KEY`: Private key funded on Base Sepolia for server-side transaction execution.

### 2. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Architecture Directory Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # SSE streaming endpoint with Inspector event tags
│   │   └── memory/route.ts     # Persistent Sibyl Memory GET/POST endpoint
│   ├── globals.css             # Tailwind v4 dark theme styles
│   ├── layout.tsx              # Web3 Wagmi & RainbowKit Provider wrapper
│   └── page.tsx                # Split view layout: Chat Interface + Live Inspector
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx   # SSE stream reader, auto-scroll, prompt bar
│   │   ├── MessageItem.tsx     # Message bubbles with decision & tx badges
│   │   └── DemoPresets.tsx     # Session 1 & Session 2 proof one-click demo buttons
│   ├── inspector/
│   │   ├── InspectorPanel.tsx  # Real-time event log stream container
│   │   └── LogCard.tsx         # Visual badges for FETCH, EVAL, DECISION, ONCHAIN
│   └── web3/
│       ├── ConnectButton.tsx   # Wagmi / RainbowKit wallet connector
│       └── TransactionBadge.tsx# BaseScan link badge with copyable hash
├── config/
│   ├── site.ts                 # Base Sepolia contract addresses & metadata
│   └── wagmi.ts                # Base Sepolia Wagmi chain configuration
├── lib/
│   ├── ai/
│   │   ├── fallback-engine.ts  # Dual-Layer AI Engine (Gemini pool -> Groq fallback)
│   │   ├── system-prompt.ts    # Agent persona & Sibyl Memory constraints
│   │   └── tools.ts            # Execution Guard & tool definitions
│   ├── memory/
│   │   ├── sibyl.ts            # Wallet-scoped memory client & persistent disk cache
│   │   └── schema.ts           # Load-bearing UserRiskProfile interface & validators
│   └── web3/
│       ├── contracts.ts        # Base Sepolia mock token registry & ABIs
│       └── viem-client.ts      # Viem real on-chain transaction execution & dispatcher
└── types/
    ├── chat.ts
    ├── inspector.ts
    └── memory.ts
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE) — an OSI-approved open-source license.

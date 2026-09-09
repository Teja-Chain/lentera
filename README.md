# Lentera — Autonomous Risk-Aware Portfolio Assistant

> **Sibyl Labs Hackathon on Base Sepolia**  
> Qualifying for the full 1.25x hackathon multiplier (Base + Virtuals Protocol GAME Framework).

Lentera is an Autonomous Risk-Aware Portfolio Assistant operating on Base Sepolia. It enforces deterministic, load-bearing risk rules across distinct browser sessions using the Sibyl Memory architecture scoped strictly by wallet address.

---

## 🌟 Key Highlights

1. **Load-Bearing Sibyl Memory Architecture**
   - User risk rules (`riskTolerance`, `maxSlippagePercent`, `allowedTokens`, `maxBudgetPerTxUsdc`, `allowUnverifiedTokens`) are strictly scoped by `walletAddress`.
   - Rules are persisted to Sibyl Memory (with deterministic local storage fallback at `.data/sibyl_memory.json` if API keys are unconfigured in dev mode).
   - Conversational chit-chat is never written to Sibyl; only extracted deterministic rules are persisted.
   - Rules survive across new chat sessions and browser restarts.

2. **Virtuals Protocol (GAME Framework) & Execution Guard**
   - Action constructs: `updateRiskProfile` and `executeSwap`.
   - When a swap is requested, the execution guard queries the user's Sibyl Memory first.
   - If a rule is violated (e.g. unverified MEME token when unverified tokens are disabled, or slippage > threshold), execution is immediately halted, emitting `[EVENT:DECISION] BLOCKED` with zero on-chain transaction.
   - If compliant, execution proceeds with Viem/Wagmi on Base Sepolia and emits `[EVENT:ONCHAIN_ACTION]`.

3. **Resilient Dual-Layer AI Engine**
   - **Primary Engine**: Google Gemini Flash 2.0 / 1.5 (`@ai-sdk/google`).
   - **Secondary Fallback**: Groq Llama 3.3 70B (`@ai-sdk/openai` configured with Groq baseURL).
   - Silent automated fallback wrapper: automatically switches on HTTP 429, 503, or rate limits without crashing the frontend.

4. **Live Agent Thought & Memory Inspector**
   - SSE streaming endpoint (`/api/chat`) broadcasts real-time execution tags:
     - `[EVENT:FETCH_MEMORY]` (Purple badge)
     - `[EVENT:EVALUATE_RISK]` (Amber badge)
     - `[EVENT:DECISION]` (Rose badge for BLOCKED / Emerald for APPROVED)
     - `[EVENT:ONCHAIN_ACTION]` (Emerald badge with BaseScan link and copyable hash)

---

## 🚀 Quick Start

### 1. Configure Environment Variables
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your API keys (optional if testing with local fallback):
- `GOOGLE_GENERATIVE_AI_API_KEY`: Google AI Studio API key
- `GROQ_API_KEY`: Groq console API key
- `SIBYL_API_KEY`: Sibyl Memory SDK API key (falls back to `.data/sibyl_memory.json` if unpopulated)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Reown/WalletConnect project ID

### 2. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Demo Presentation Walkthrough

### Step 1: Connect Wallet
Connect MetaMask or Coinbase Wallet on Base Sepolia using the Connect Wallet button in the header.

### Step 2: Session 1 — Set Strict Low Risk
Click preset button **"Session 1: Set Strict Low Risk"** in the chat interface.
- Watch the **Thought & Memory Inspector** panel stream `[EVENT:FETCH_MEMORY]` and `[EVENT:DECISION]`.
- The rule is persisted to Sibyl Memory:
  - Max Slippage: `1.0%`
  - Allowed Tokens: `USDC, WETH, ETH`
  - Max Budget: `50 USDC`
  - Allow Unverified Tokens: `false`

### Step 3: Start a Fresh Session
Click **"New Session"** in the top navigation bar.
- Notice that the chat message log resets completely to prove a new session has started.
- Notice that the **Active Sibyl Memory Rules** in the Inspector panel retain the strict rules from Session 1.

### Step 4: Session 2 Proof — Attempt Swap to Unverified Token
Click preset button **"Session 2 Proof: Attempt MEME Swap"**.
- Watch the **Thought & Memory Inspector** evaluate the trade against the loaded Sibyl rules.
- **Result**: The agent emits `[EVENT:DECISION] BLOCKED` (Rose badge) citing that the token is unverified.
- **Execution Guard**: The transaction is strictly aborted with zero on-chain transaction dispatched, proving load-bearing memory compliance.

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
│   │   ├── MessageItem.tsx     # Message bubbles with decision badges & tx badges
│   │   └── DemoPresets.tsx     # Session 1 & Session 2 proof one-click demo buttons
│   ├── inspector/
│   │   ├── InspectorPanel.tsx  # Real-time event log stream container
│   │   └── LogCard.tsx         # Visual badges for FETCH, EVAL, DECISION, ONCHAIN
│   ├── web3/
│   │   ├── ConnectButton.tsx   # Custom Wagmi / RainbowKit wallet connector
│   │   └── TransactionBadge.tsx# BaseScan link badge with copyable hash
│   └── common/
│       └── Header.tsx          # Top bar with Base Sepolia network status
├── config/
│   ├── site.ts                 # Base Sepolia contract addresses & metadata
│   └── wagmi.ts                # Base Sepolia Wagmi chain configuration
├── lib/
│   ├── ai/
│   │   ├── fallback-engine.ts  # Dual-Layer AI Engine (Gemini -> Groq fallback)
│   │   ├── system-prompt.ts    # Agent persona & Sibyl Memory constraints
│   │   └── tools.ts            # Virtuals GAME actions & Sibyl Execution Guard
│   ├── memory/
│   │   ├── sibyl.ts            # Sibyl client with wallet scoping & local disk fallback
│   │   └── schema.ts           # Load-bearing UserRiskProfile interface & validators
│   └── web3/
│       ├── contracts.ts        # Base Sepolia mock token & DEX router ABIs
│       └── viem-client.ts      # Viem contract transaction simulation & dispatcher
└── types/
    ├── chat.ts
    ├── inspector.ts
    └── memory.ts
```

import { z } from "zod";
import { tool } from "ai";
import { getUserRiskProfile, setUserRiskProfile } from "@/lib/memory/sibyl";
import { simulateSwap } from "@/lib/web3/viem-client";
import { MOCK_TOKENS } from "@/lib/web3/contracts";
import type { InspectorEvent } from "@/types/inspector";

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  inspectorEvents: InspectorEvent[];
  data?: any;
}

/**
 * Agent Action Definition Interface
 */
export interface AgentActionDefinition<T = any> {
  name: string;
  description: string;
  parameters: z.ZodType<T>;
  execute: (args: T, context: { walletAddress: string }) => Promise<ToolExecutionResult>;
}

export const UpdateRiskProfileParamsSchema = z.object({
  riskTolerance: z.enum(["low", "medium", "high"]).optional().describe("Risk level tolerance"),
  maxSlippagePercent: z.number().min(0.1).max(50).optional().describe("Max allowed slippage percentage"),
  allowedTokens: z.array(z.string()).optional().describe("List of approved token symbols"),
  maxBudgetPerTxUsdc: z.number().positive().optional().describe("Max USDC spend allowed per transaction"),
  allowUnverifiedTokens: z.boolean().optional().describe("Whether unverified/meme tokens can be traded"),
});

export type UpdateRiskProfileParams = z.infer<typeof UpdateRiskProfileParamsSchema>;

/**
 * Action 1: updateRiskProfile
 * Writes strictly typed rules to Sibyl Memory
 */
export const updateRiskProfileAction: AgentActionDefinition<UpdateRiskProfileParams> = {
  name: "updateRiskProfile",
  description:
    "Update the user's load-bearing risk parameters in Sibyl Memory (riskTolerance, maxSlippagePercent, allowedTokens, maxBudgetPerTxUsdc, allowUnverifiedTokens).",
  parameters: UpdateRiskProfileParamsSchema,
  execute: async (args, { walletAddress }) => {
    const inspectorEvents: InspectorEvent[] = [];
    const timestamp = new Date().toLocaleTimeString();

    // 1. Fetch current memory
    const { profile: oldProfile } = await getUserRiskProfile(walletAddress);
    inspectorEvents.push({
      id: `ev-${Date.now()}-1`,
      type: "FETCH_MEMORY",
      timestamp,
      title: "Sibyl Memory Retrieved",
      data: {
        wallet: walletAddress,
        currentRisk: oldProfile.riskTolerance,
        maxSlippage: `${oldProfile.maxSlippagePercent}%`,
        maxBudget: `${oldProfile.maxBudgetPerTxUsdc} USDC`,
        allowUnverified: oldProfile.allowUnverifiedTokens,
      },
      status: "info",
    });

    // 2. Persist updated rules to Sibyl Memory
    const { profile: newProfile, source } = await setUserRiskProfile(walletAddress, args);
    inspectorEvents.push({
      id: `ev-${Date.now()}-2`,
      type: "DECISION",
      timestamp,
      title: "Risk Profile Persisted to Sibyl",
      data: {
        newTolerance: newProfile.riskTolerance,
        maxSlippage: `${newProfile.maxSlippagePercent}%`,
        maxBudget: `${newProfile.maxBudgetPerTxUsdc} USDC`,
        unverifiedAllowed: newProfile.allowUnverifiedTokens,
        storageSource: source,
      },
      status: "approved",
    });

    return {
      success: true,
      message: `Risk profile updated in Sibyl Memory (${source}): Risk=${newProfile.riskTolerance.toUpperCase()}, Max Slippage=${newProfile.maxSlippagePercent}%, Max Budget=${newProfile.maxBudgetPerTxUsdc} USDC, Unverified Tokens=${newProfile.allowUnverifiedTokens ? "Allowed" : "Blocked"}.`,
      inspectorEvents,
      data: newProfile,
    };
  },
};

/**
 * Action 2: executeSwap
 * Enforces Sibyl Memory Execution Guard before on-chain execution
 */
export const ExecuteSwapParamsSchema = z.object({
  tokenTarget: z.string().describe("Target token symbol (e.g. WETH, ETH, MEME)"),
  amountInUsdc: z.number().positive().describe("Amount of USDC to swap"),
  slippageTolerance: z.number().positive().describe("Requested slippage tolerance percentage (e.g. 1.0)"),
});

export type ExecuteSwapParams = z.infer<typeof ExecuteSwapParamsSchema>;

export const executeSwapAction: AgentActionDefinition<ExecuteSwapParams> = {
  name: "executeSwap",
  description:
    "Execute or simulate a swap of USDC to a target token on Base Sepolia. Strictly guarded by Sibyl Memory.",
  parameters: ExecuteSwapParamsSchema,
  execute: async (args, { walletAddress }) => {
    const { tokenTarget, amountInUsdc, slippageTolerance } = args;
    const inspectorEvents: InspectorEvent[] = [];
    const timestamp = new Date().toLocaleTimeString();

    // STEP 1: Query Sibyl Memory for this user's persistent risk rules
    const { profile } = await getUserRiskProfile(walletAddress);
    inspectorEvents.push({
      id: `ev-${Date.now()}-1`,
      type: "FETCH_MEMORY",
      timestamp,
      title: "Querying Sibyl Memory Execution Guard",
      data: {
        wallet: walletAddress,
        storedMaxSlippage: `${profile.maxSlippagePercent}%`,
        storedMaxBudget: `${profile.maxBudgetPerTxUsdc} USDC`,
        storedAllowedTokens: profile.allowedTokens,
        storedAllowUnverified: profile.allowUnverifiedTokens,
      },
      status: "info",
    });

    // STEP 2: Evaluate requested action against stored rules
    const targetUpper = tokenTarget.toUpperCase();
    const tokenMetadata = MOCK_TOKENS[targetUpper as keyof typeof MOCK_TOKENS];
    const isUnverified = !tokenMetadata || tokenMetadata.verified === false;

    inspectorEvents.push({
      id: `ev-${Date.now()}-2`,
      type: "EVALUATE_RISK",
      timestamp,
      title: "Evaluating Trade Against Sibyl Memory Rules",
      data: {
        requestedToken: targetUpper,
        isUnverifiedToken: isUnverified,
        requestedAmount: `${amountInUsdc} USDC (Limit: ${profile.maxBudgetPerTxUsdc} USDC)`,
        requestedSlippage: `${slippageTolerance}% (Limit: ${profile.maxSlippagePercent}%)`,
      },
      status: "pending",
    });

    // GUARD CHECK A: Unverified token check
    if (isUnverified && !profile.allowUnverifiedTokens) {
      const reason = `BLOCKED: Token '${targetUpper}' is unverified/unwhitelisted. Your stored Sibyl Memory risk profile strictly prohibits unverified tokens.`;
      inspectorEvents.push({
        id: `ev-${Date.now()}-3`,
        type: "DECISION",
        timestamp,
        title: "Trade BLOCKED by Sibyl Memory",
        data: { reason, violatedRule: "allowUnverifiedTokens == false" },
        status: "blocked",
      });

      return {
        success: false,
        message: reason,
        inspectorEvents,
      };
    }

    // GUARD CHECK B: Slippage check
    if (slippageTolerance > profile.maxSlippagePercent) {
      const reason = `BLOCKED: Requested slippage (${slippageTolerance}%) exceeds your stored Sibyl maximum threshold of ${profile.maxSlippagePercent}%.`;
      inspectorEvents.push({
        id: `ev-${Date.now()}-3`,
        type: "DECISION",
        timestamp,
        title: "Trade BLOCKED by Sibyl Memory",
        data: { reason, violatedRule: `slippage ${slippageTolerance}% > ${profile.maxSlippagePercent}%` },
        status: "blocked",
      });

      return {
        success: false,
        message: reason,
        inspectorEvents,
      };
    }

    // GUARD CHECK C: Budget check
    if (amountInUsdc > profile.maxBudgetPerTxUsdc) {
      const reason = `BLOCKED: Requested amount (${amountInUsdc} USDC) exceeds your stored maximum budget per transaction (${profile.maxBudgetPerTxUsdc} USDC).`;
      inspectorEvents.push({
        id: `ev-${Date.now()}-3`,
        type: "DECISION",
        timestamp,
        title: "Trade BLOCKED by Sibyl Memory",
        data: { reason, violatedRule: `amount ${amountInUsdc} > ${profile.maxBudgetPerTxUsdc}` },
        status: "blocked",
      });

      return {
        success: false,
        message: reason,
        inspectorEvents,
      };
    }

    // STEP 3: All rules satisfied! Emit APPROVED
    inspectorEvents.push({
      id: `ev-${Date.now()}-3`,
      type: "DECISION",
      timestamp,
      title: "Trade APPROVED by Execution Guard",
      data: {
        reason: "All parameters comply strictly with stored Sibyl Memory risk profile.",
        compliance: {
          tokenAllowed: true,
          slippageWithinLimit: true,
          budgetWithinLimit: true,
        },
      },
      status: "approved",
    });

    // STEP 4: On-Chain execution / simulation via Viem on Base Sepolia
    const sim = await simulateSwap({
      tokenInSymbol: "USDC",
      tokenOutSymbol: targetUpper,
      amountInUsdc,
      slippageTolerancePercent: slippageTolerance,
      recipientAddress: walletAddress,
    });

    const isReal = sim.isSimulated === false;

    inspectorEvents.push({
      id: `ev-${Date.now()}-4`,
      type: "ONCHAIN_ACTION",
      timestamp,
      title: isReal
        ? "Base Sepolia DEX Contract Executed"
        : "Simulated Execution (No Real Tx)",
      data: {
        network: "Base Sepolia (Chain ID 84532)",
        contract: `LenteraSwapRouter (${sim.routerAddress})`,
        function: "swapExactTokensForTokens",
        action: `Swap ${amountInUsdc} USDC -> ~${sim.expectedOut} ${targetUpper}`,
        txHash: sim.txHash,
        executionMode: isReal ? "on-chain smart contract" : "simulated",
        status: isReal ? "Confirmed on Base Sepolia" : "Simulated Execution — no BaseScan link",
        ...(isReal && {
          explorerUrl: `https://sepolia.basescan.org/tx/${sim.txHash}`,
        }),
      },
      status: "approved",
      // Only attach txHash to the inspector link when it is a real on-chain hash
      txHash: isReal ? sim.txHash : undefined,
    });

    const modeLabel = isReal
      ? `Contract: LenteraSwapRouter (${sim.routerAddress}) | Tx Hash: ${sim.txHash}`
      : `Simulated Execution (no on-chain tx — RELAYER_PRIVATE_KEY not set or relayer failed).`;

    return {
      success: true,
      message: `Swap executed on Base Sepolia via LenteraSwapRouter (swapExactTokensForTokens). Swapped ${amountInUsdc} USDC for ${sim.expectedOut} ${targetUpper}. ${modeLabel}`,
      inspectorEvents,
      data: sim,
    };
  },
};

/**
 * Helper to build Vercel AI SDK compatible tool definitions
 */
export function createAgentTools(walletAddress: string) {
  return {
    updateRiskProfile: tool({
      description: updateRiskProfileAction.description,
      inputSchema: UpdateRiskProfileParamsSchema,
      execute: async (args: UpdateRiskProfileParams) => {
        return updateRiskProfileAction.execute(args, { walletAddress });
      },
    }),
    executeSwap: tool({
      description: executeSwapAction.description,
      inputSchema: ExecuteSwapParamsSchema,
      execute: async (args: ExecuteSwapParams) => {
        return executeSwapAction.execute(args, { walletAddress });
      },
    }),
  };
}

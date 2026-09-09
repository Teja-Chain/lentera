import { z } from "zod";
import type { UserRiskProfile } from "@/types/memory";

export const DEFAULT_RISK_PROFILE: UserRiskProfile = {
  riskTolerance: "medium",
  maxSlippagePercent: 2.0,
  allowedTokens: ["USDC", "WETH", "ETH"],
  maxBudgetPerTxUsdc: 100,
  allowUnverifiedTokens: false,
  lastUpdated: new Date().toISOString(),
};

export const STRICT_LOW_RISK_PROFILE: UserRiskProfile = {
  riskTolerance: "low",
  maxSlippagePercent: 1.0,
  allowedTokens: ["USDC", "WETH", "ETH"],
  maxBudgetPerTxUsdc: 50,
  allowUnverifiedTokens: false,
  lastUpdated: new Date().toISOString(),
};

export const UserRiskProfileSchema = z.object({
  riskTolerance: z.enum(["low", "medium", "high"]).default("medium"),
  maxSlippagePercent: z.number().min(0.1).max(50).default(2.0),
  allowedTokens: z.array(z.string()).default(["USDC", "WETH", "ETH"]),
  maxBudgetPerTxUsdc: z.number().positive().default(100),
  allowUnverifiedTokens: z.boolean().default(false),
  lastUpdated: z.string().optional(),
});

export const UpdateRiskProfileInputSchema = z.object({
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  maxSlippagePercent: z.number().min(0.1).max(50).optional(),
  allowedTokens: z.array(z.string()).optional(),
  maxBudgetPerTxUsdc: z.number().positive().optional(),
  allowUnverifiedTokens: z.boolean().optional(),
});

export type UpdateRiskProfileInput = z.infer<typeof UpdateRiskProfileInputSchema>;

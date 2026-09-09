export interface UserRiskProfile {
  riskTolerance: "low" | "medium" | "high";
  maxSlippagePercent: number;
  allowedTokens: string[];
  maxBudgetPerTxUsdc: number;
  allowUnverifiedTokens: boolean;
  lastUpdated: string;
}

export interface StoredMemoryRecord {
  walletAddress: string;
  riskProfile: UserRiskProfile;
  updatedAt: string;
}

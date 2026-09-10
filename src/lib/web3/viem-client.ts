import "server-only";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { siteConfig } from "@/config/site";

// ─── Clients ──────────────────────────────────────────────────────────────────

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || siteConfig.network.rpcUrl;

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  success: boolean;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  expectedOut: string;
  slippageTolerancePercent: number;
  routerAddress: string;
  gasEstimateGwei: string;
  txHash?: string;
  /** true  = no real tx was sent; BaseScan link must NOT be rendered */
  isSimulated?: boolean;
  error?: string;
}

// ─── Real On-Chain Relayer ────────────────────────────────────────────────────

/**
 * Sends a minimal ETH transfer (0.00001 ETH) from the relayer account to
 * `recipientAddress` on Base Sepolia, waits for the receipt, and returns the
 * real transaction hash.
 *
 * This lightweight "proof-of-execution" transfer is used as a stand-in for the
 * actual swap while the testnet router is not yet deployed.  The amount is
 * intentionally tiny so the relayer balance is not meaningfully depleted.
 *
 * Throws if the key is invalid or if the transaction reverts / times out.
 */
async function executeRelayerTx(recipientAddress: string): Promise<`0x${string}`> {
  const rawKey = process.env.RELAYER_PRIVATE_KEY!;
  // Normalise: viem requires a 0x-prefixed 32-byte hex string
  const hexKey = (
    rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`
  ) as `0x${string}`;

  const account = privateKeyToAccount(hexKey);

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  // viem 2.x: account must be passed explicitly even when set on the client
  const hash = await walletClient.sendTransaction({
    account,
    to: recipientAddress as `0x${string}`,
    value: parseEther("0.00001"),
  });

  // Wait for at least 1 confirmation before returning
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

  return hash;
}

// ─── Public simulateSwap ──────────────────────────────────────────────────────

/**
 * Execute (or simulate) a swap on Base Sepolia.
 *
 * ### Execution modes
 * | `RELAYER_PRIVATE_KEY` | Mode |
 * |---|---|
 * | Present & tx succeeds | Real on-chain ETH transfer → real `txHash` (`isSimulated: false`) |
 * | Missing OR tx fails   | Mock receipt with `isSimulated: true` (no BaseScan link) |
 */
export async function simulateSwap(params: {
  tokenInSymbol: "USDC";
  tokenOutSymbol: string;
  amountInUsdc: number;
  slippageTolerancePercent: number;
  recipientAddress: string;
}): Promise<SimulationResult> {
  const { tokenOutSymbol, amountInUsdc, slippageTolerancePercent, recipientAddress } =
    params;

  const targetUpper = tokenOutSymbol.toUpperCase();
  // Deterministic mock exchange rate used for display in both modes
  const rateMultiplier =
    targetUpper === "WETH" ? 0.00038 : targetUpper === "MEME" ? 100 : 1;
  const expectedOutFloat = amountInUsdc * rateMultiplier;
  const expectedOut = expectedOutFloat.toFixed(6);

  const base: Omit<SimulationResult, "txHash" | "isSimulated" | "error"> = {
    success: true,
    tokenIn: "USDC",
    tokenOut: targetUpper,
    amountIn: amountInUsdc,
    expectedOut,
    slippageTolerancePercent,
    routerAddress: siteConfig.contracts.mockRouter,
    gasEstimateGwei: "0.15",
  };

  // ── Real execution path ───────────────────────────────────────────────────
  const relayerKey = process.env.RELAYER_PRIVATE_KEY;
  if (relayerKey) {
    try {
      const txHash = await executeRelayerTx(recipientAddress);
      return { ...base, txHash, isSimulated: false };
    } catch (execErr: any) {
      console.warn(
        "[Relayer] On-chain execution failed — falling back to simulation.",
        execErr?.message
      );
      // Fall through to simulated path
    }
  }

  // ── Simulated fallback path ───────────────────────────────────────────────
  // Generate a deterministic-looking mock hash so the UI has something to
  // display, but mark it as simulated so the route never hyperlinks to BaseScan.
  const mockHash = `0x${Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}` as `0x${string}`;

  return { ...base, txHash: mockHash, isSimulated: true };
}


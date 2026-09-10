import "server-only";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseUnits,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { siteConfig } from "@/config/site";
import { LENTERA_ROUTER_ABI, MOCK_TOKENS } from "@/lib/web3/contracts";

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

// ─── Real On-Chain Relayer (Smart Contract DEX Interaction) ───────────────────

/**
 * Executes a real DEX swap call (`swapExactTokensForTokens`) on the deployed
 * LenteraSwapRouter smart contract on Base Sepolia.
 *
 * Emits `SwapExecuted` on-chain, records the exact token path, amountIn, and slippage-bounded
 * amountOutMin, and attaches a micro-ETH proof-of-execution forward to the recipient wallet.
 */
async function executeRelayerSwap(params: {
  recipientAddress: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountInUsdc: number;
  expectedOut: string;
  slippageTolerancePercent: number;
}): Promise<`0x${string}`> {
  const {
    recipientAddress,
    tokenInSymbol,
    tokenOutSymbol,
    amountInUsdc,
    expectedOut,
    slippageTolerancePercent,
  } = params;

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

  // Resolve token addresses
  const inMeta = MOCK_TOKENS[tokenInSymbol as keyof typeof MOCK_TOKENS] as { address: string; decimals: number } | undefined;
  const outMeta = MOCK_TOKENS[tokenOutSymbol as keyof typeof MOCK_TOKENS] as { address: string; decimals: number } | undefined;

  const tokenInAddress = (inMeta?.address || siteConfig.contracts.usdc) as `0x${string}`;
  const tokenOutAddress = (outMeta?.address || siteConfig.contracts.weth) as `0x${string}`;

  const inDecimals = inMeta?.decimals ?? 6;
  const outDecimals = outMeta?.decimals ?? 18;

  // Calculate slippage bounded minimum output
  const expectedOutNum = parseFloat(expectedOut);
  const minOutNum = Math.max(0, expectedOutNum * (1 - slippageTolerancePercent / 100));

  const amountInBig = parseUnits(amountInUsdc.toString(), inDecimals);
  const amountOutMinBig = parseUnits(minOutNum.toFixed(6), outDecimals);

  const targetRecipient = isAddress(recipientAddress)
    ? (recipientAddress as `0x${string}`)
    : account.address;

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 min deadline

  // Execute smart contract swap on LenteraSwapRouter
  const hash = await walletClient.writeContract({
    account,
    address: siteConfig.contracts.router as `0x${string}`,
    abi: LENTERA_ROUTER_ABI,
    functionName: "swapExactTokensForTokens",
    args: [
      amountInBig,
      amountOutMinBig,
      [tokenInAddress, tokenOutAddress],
      targetRecipient,
      deadline,
    ],
    value: parseEther("0.00001"), // micro-execution confirmation forwarded to recipient
  });

  // Wait for at least 1 confirmation before returning
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

  return hash;
}

// ─── Public simulateSwap ──────────────────────────────────────────────────────

/**
 * Execute a swap on Base Sepolia via real smart contract invocation or fallback simulation.
 *
 * ### Execution modes
 * | `RELAYER_PRIVATE_KEY` | Mode |
 * |---|---|
 * | Present & tx succeeds | Real on-chain DEX router contract call → real `txHash` (`isSimulated: false`) |
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
    routerAddress: siteConfig.contracts.router,
    gasEstimateGwei: "0.15",
  };

  // ── Real execution path ───────────────────────────────────────────────────
  const relayerKey = process.env.RELAYER_PRIVATE_KEY;
  if (relayerKey) {
    try {
      const txHash = await executeRelayerSwap({
        recipientAddress,
        tokenInSymbol: "USDC",
        tokenOutSymbol: targetUpper,
        amountInUsdc,
        expectedOut,
        slippageTolerancePercent,
      });
      return { ...base, txHash, isSimulated: false };
    } catch (execErr: any) {
      console.warn(
        "[Relayer] On-chain smart contract execution failed — falling back to simulation.",
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



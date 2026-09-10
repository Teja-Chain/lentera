import { parseAbi } from "viem";
import { siteConfig } from "@/config/site";

export const MOCK_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin (Mock)",
    decimals: 6,
    address: siteConfig.contracts.usdc,
    verified: true,
  },
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    address: siteConfig.contracts.weth,
    verified: true,
  },
  ETH: {
    symbol: "ETH",
    name: "Native Ether",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000000",
    verified: true,
  },
  MEME: {
    symbol: "MEME",
    name: "DegenMoonRocket (Unverified)",
    decimals: 18,
    address: siteConfig.contracts.meme,
    verified: false,
  },
} as const;

export const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
]);

export const LENTERA_ROUTER_ABI = parseAbi([
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) payable returns (uint256[] memory amounts)",
  "function getAmountsOut(uint256 amountIn, address[] calldata path) view returns (uint256[] memory amounts)",
  "event SwapExecuted(address indexed sender, address indexed recipient, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint256 amountOutReceived)",
]);

export const MOCK_ROUTER_ABI = LENTERA_ROUTER_ABI;


export const siteConfig = {
  name: "Lentera",
  description:
    "Autonomous Risk-Aware Portfolio Assistant on Base Sepolia with Sibyl Memory",
  network: {
    name: "Base Sepolia",
    chainId: 84532,
    explorerUrl: "https://sepolia.basescan.org",
    rpcUrl: "https://sepolia.base.org",
  },
  contracts: {
    // Standard Base Sepolia testnet token addresses
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    weth: "0x4200000000000000000000000000000000000006",
    meme: "0x9876543210987654321098765432109876543210", // Mock unverified token for Demo Session 2
    router: "0xfa943428509e9a56a024b298cdc8de1ed8b3dcb2",
    mockRouter: "0xfa943428509e9a56a024b298cdc8de1ed8b3dcb2",
  },
};

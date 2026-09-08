import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { coinbaseWallet, metaMaskWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";

// Built with connectorsForWallets (not RainbowKit's getDefaultConfig) so we
// can leave out RainbowKit's "Base" wallet entry, which drags in
// @coinbase/cdp-sdk's optional x402 payment modules and breaks the Next.js
// build (those modules aren't installed and aren't needed here). The
// classic `coinbaseWallet` connector below covers Coinbase Wallet fine.
//
// Deliberately no `injectedWallet` catch-all alongside `metaMaskWallet`:
// both bind to the same `window.ethereum` when MetaMask is the only
// injected provider, which left wagmi's auto-reconnect stuck in
// "reconnecting" (RainbowKit's UI showed connected, but useAccount()
// elsewhere never flipped to isConnected). One connector per real wallet.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// walletConnectWallet needs a real project id (from cloud.reown.com) to even
// initialize -- with a placeholder it throws during its own network setup,
// which was enough to leave wagmi's whole reconnect flow stuck for every
// connector, not just WalletConnect. So only wire it up once a real id is
// configured; MetaMask + Coinbase Wallet work fine without it.
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: projectId ? [metaMaskWallet, coinbaseWallet, walletConnectWallet] : [metaMaskWallet, coinbaseWallet],
    },
  ],
  {
    appName: "Lentera",
    projectId: projectId || "00000000000000000000000000000000",
  }
);

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { siteConfig } from "./site";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "00000000000000000000000000000000";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular Wallets",
      wallets:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
          ? [metaMaskWallet, coinbaseWallet, walletConnectWallet]
          : [metaMaskWallet, coinbaseWallet],
    },
  ],
  {
    appName: siteConfig.name,
    projectId,
  }
);

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  transports: {
    [baseSepolia.id]: http(siteConfig.network.rpcUrl),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

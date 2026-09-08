import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // RainbowKit's index barrel pulls in @wagmi/connectors' `baseAccount`
  // connector unconditionally, which pulls in @coinbase/cdp-sdk's optional
  // x402 payment modules (@x402/*). Those aren't installed and aren't used
  // by anything in this app (plain MetaMask/Coinbase/WalletConnect only),
  // so keep cdp-sdk out of the bundle instead of statically resolving it.
  serverExternalPackages: ["@coinbase/cdp-sdk"],
};

export default nextConfig;

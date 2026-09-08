"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/wagmi-config";

// Re-themed to match the app's dark violet/cyan palette instead of
// RainbowKit's default blue -- same modal internals, our colors.
const rainbowTheme = darkTheme({
  accentColor: "#7c6ff7",
  accentColorForeground: "#ffffff",
  borderRadius: "medium",
  overlayBlur: "small",
  fontStack: "system",
});
rainbowTheme.colors.modalBackground = "#14161f";
rainbowTheme.colors.modalBorder = "rgba(255, 255, 255, 0.08)";
rainbowTheme.colors.modalText = "#f3f4f6";
rainbowTheme.colors.modalTextSecondary = "#9ba1ae";
rainbowTheme.colors.modalTextDim = "#5f6572";
rainbowTheme.colors.profileForeground = "#1b1e2a";
rainbowTheme.colors.generalBorder = "rgba(255, 255, 255, 0.08)";
rainbowTheme.colors.generalBorderDim = "rgba(255, 255, 255, 0.04)";
rainbowTheme.colors.connectButtonBackground = "#1b1e2a";
rainbowTheme.colors.connectionIndicator = "#34d399";
rainbowTheme.colors.closeButtonBackground = "rgba(255, 255, 255, 0.06)";
rainbowTheme.colors.menuItemBackground = "rgba(255, 255, 255, 0.04)";
rainbowTheme.colors.profileAction = "rgba(255, 255, 255, 0.04)";
rainbowTheme.colors.profileActionHover = "rgba(255, 255, 255, 0.08)";
rainbowTheme.shadows.dialog = "0 20px 60px rgba(0, 0, 0, 0.6)";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/config/wagmi";

// Build the theme entirely within darkTheme() without post-construction mutation.
// Mutating the frozen sprinkles CSS object after construction causes:
//   RangeError: invalid border=0
// because the theme's radii/borders are mapped internally to a constrained
// set of values ("large"|"medium"|"small"|"none") that break when reassigned.
const lenteraTheme = darkTheme({
  accentColor: "#7c6ff7",
  accentColorForeground: "#ffffff",
  borderRadius: "medium",
  overlayBlur: "small",
  fontStack: "system",
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/*
          We apply our Lentera color overrides via a CSS variable wrapper <div>
          rather than mutating the returned theme object, which is not safe.
          RainbowKit reads modal colors from the theme object — extra overrides
          are done purely with CSS custom property injection.
        */}
        <style>{`
          [data-rk] .iekbcc0 {
            --rk-colors-modalBackground: #0f111c;
            --rk-colors-generalBorder: rgba(255, 255, 255, 0.08);
            --rk-colors-modalText: #f3f4f6;
            --rk-colors-modalTextSecondary: #9ba1ae;
            --rk-colors-profileForeground: #161926;
            --rk-colors-connectButtonBackground: #161926;
          }
        `}</style>
        <RainbowKitProvider theme={lenteraTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

"use client";

import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet, ShieldCheck } from "lucide-react";

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-600/20 px-3.5 py-2 text-xs font-medium text-purple-200 transition-all hover:border-purple-400 hover:bg-purple-600/30 hover:shadow-lg hover:shadow-purple-500/10 active:scale-95"
                  >
                    <Wallet size={14} className="text-purple-400" />
                    <span>Connect Wallet</span>
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/30"
                  >
                    <span>Switch to Base Sepolia</span>
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#14161f] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-purple-500/40 hover:bg-[#1b1e2a]"
                  >
                    <ShieldCheck size={14} className="text-purple-400" />
                    <span>{account.displayName}</span>
                    {account.displayBalance ? (
                      <span className="text-zinc-400">({account.displayBalance})</span>
                    ) : null}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}

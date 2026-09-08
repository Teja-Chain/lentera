"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { AddressAvatar } from "./Avatar";

// ConnectButton.Custom hands us RainbowKit's connection state/modal openers
// so the trigger itself can match this app's visual language exactly, while
// the wallet list/QR modal underneath still comes from RainbowKit.
export function WalletConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div aria-hidden={!ready} style={!ready ? { opacity: 0, pointerEvents: "none" } : undefined}>
            {!connected ? (
              <button
                onClick={openConnectModal}
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium text-white shadow-lg shadow-accent/20 transition-transform hover:scale-[1.03] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
              >
                <Wallet size={14} />
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                onClick={openChainModal}
                className="rounded-full border border-deny/40 bg-deny-soft px-3 py-1.5 text-[12.5px] font-medium text-deny"
              >
                Wrong network
              </button>
            ) : (
              <button
                onClick={openAccountModal}
                className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3.5 pl-1 text-[13px] text-text transition-colors hover:border-border-strong"
              >
                <AddressAvatar address={account.address} size={24} />
                <span className="font-medium">{account.displayName}</span>
                {account.displayBalance && (
                  <span className="font-tabular text-text-subtle">{account.displayBalance}</span>
                )}
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

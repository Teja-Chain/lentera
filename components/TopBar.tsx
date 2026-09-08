import { Sparkles } from "lucide-react";
import { WalletConnectButton } from "./WalletConnectButton";
import { SessionSwitcher } from "./SessionSwitcher";

export function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface/40 px-5 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-lg shadow-accent/20"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
        >
          <Sparkles size={16} strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight text-text">Lentera</div>
          <div className="text-[11px] text-text-subtle">risk-aware portfolio agent</div>
        </div>
        <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-muted sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-safe" />
          Base Sepolia
        </span>
      </div>
      <div className="flex items-center gap-3">
        <SessionSwitcher />
        <WalletConnectButton />
      </div>
    </header>
  );
}

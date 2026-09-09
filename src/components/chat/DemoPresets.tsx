"use client";

import { ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";

interface DemoPresetsProps {
  onSelectPreset: (prompt: string) => void;
  disabled?: boolean;
}

export function DemoPresets({ onSelectPreset, disabled }: DemoPresetsProps) {
  const preset1 =
    "Please set my risk profile to strict low risk: maximum 1% slippage, strictly no unverified or meme tokens, and maximum 50 USDC budget per transaction.";

  const preset2 =
    "Attempt to swap 50 USDC to unverified MEME token with 2% slippage tolerance.";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#121420]/80 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        <Sparkles size={12} className="text-cyan-400" />
        <span>Sibyl Hackathon Demo Presets</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Preset Button 1: Session 1 */}
        <button
          onClick={() => onSelectPreset(preset1)}
          disabled={disabled}
          type="button"
          className="group relative flex flex-col items-start gap-1 rounded-lg border border-purple-500/20 bg-purple-500/5 p-2.5 text-left transition-all hover:border-purple-500/50 hover:bg-purple-500/10 active:scale-[0.98] disabled:opacity-40"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
            <ShieldCheck size={14} className="text-purple-400" />
            <span>Session 1: Set Strict Low Risk</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            Max 1% slippage, no unverified tokens, max 50 USDC/tx persisted to Sibyl Memory.
          </p>
        </button>

        {/* Preset Button 2: Session 2 Proof */}
        <button
          onClick={() => onSelectPreset(preset2)}
          disabled={disabled}
          type="button"
          className="group relative flex flex-col items-start gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-left transition-all hover:border-rose-500/50 hover:bg-rose-500/10 active:scale-[0.98] disabled:opacity-40"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
            <ShieldAlert size={14} className="text-rose-400" />
            <span>Session 2 Proof: Attempt MEME Swap</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            Attempts swap to unverified token. Load-bearing memory BLOCKS it automatically.
          </p>
        </button>
      </div>
    </div>
  );
}

import { Sparkles } from "lucide-react";
import { addressGradient } from "@/lib/avatar";

export function AddressAvatar({ address, size = 28 }: { address: string; size?: number }) {
  return (
    <div
      className="shrink-0 rounded-full ring-1 ring-white/10"
      style={{ width: size, height: size, background: addressGradient(address) }}
    />
  );
}

export function AgentAvatar({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-white ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
      }}
    >
      <Sparkles size={size * 0.55} strokeWidth={2.25} />
    </div>
  );
}

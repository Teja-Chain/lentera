import { Coins, FileText, Percent, ShieldCheck, ShieldOff, TrendingDown, Info } from "lucide-react";

function fmtKey(k: string) {
  return k.replace(/_/g, " ");
}

function fmtValue(v: unknown) {
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "number") return v.toLocaleString("en-US");
  return String(v);
}

function iconFor(key: string, value: unknown) {
  if (key.includes("capital") || key.includes("usdc")) return Coins;
  if (key.includes("slippage")) return Percent;
  if (key.includes("unverified")) return value ? ShieldOff : ShieldCheck;
  if (key.includes("loss") || key.includes("tolerance")) return TrendingDown;
  if (key.includes("note")) return FileText;
  return Info;
}

export function RiskProfileCard({ profile }: { profile: Record<string, unknown> | null }) {
  if (!profile || Object.keys(profile).length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-[12.5px] leading-relaxed text-text-subtle">
        No risk profile stored yet. Tell the agent your risk tolerance to create one.
      </div>
    );
  }
  return (
    <div className="space-y-1 rounded-xl border border-border bg-surface p-2">
      {Object.entries(profile).map(([k, v]) => {
        const Icon = iconFor(k, v);
        return (
          <div key={k} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
            <span className="flex items-center gap-2 text-[12.5px] text-text-muted capitalize">
              <Icon size={14} className="text-accent" />
              {fmtKey(k)}
            </span>
            <span className="font-tabular text-[13px] font-medium text-text">{fmtValue(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function EventLog({ events }: { events: unknown[] }) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-[12.5px] text-text-subtle">
        No journal events yet.
      </div>
    );
  }
  return (
    <ol className="space-y-2.5">
      {events.map((e, i) => (
        <li key={i} className="relative rounded-xl border border-border bg-surface py-2 pr-3 pl-3.5">
          <span className="absolute top-3 left-0 h-1.5 w-1.5 -translate-x-[calc(50%+0.5px)] rounded-full bg-accent" />
          <span className="text-[12.5px] leading-relaxed text-text-muted">
            {typeof e === "string" ? e : JSON.stringify(e)}
          </span>
        </li>
      ))}
    </ol>
  );
}

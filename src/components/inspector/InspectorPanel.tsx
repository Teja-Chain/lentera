"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Activity,
  ShieldCheck,
  Database,
  Trash2,
  Sliders,
  DollarSign,
  ShieldAlert,
  Percent,
} from "lucide-react";
import { useAgentStore } from "@/store/useAgentStore";
import { LogCard } from "./LogCard";

type FilterTab = "ALL" | "MEMORY" | "GUARD" | "ONCHAIN";

export function InspectorPanel() {
  const inspectorEvents = useAgentStore((s) => s.inspectorEvents);
  const clearInspectorEvents = useAgentStore((s) => s.clearInspectorEvents);
  const riskProfile = useAgentStore((s) => s.riskProfile);
  const memorySource = useAgentStore((s) => s.memorySource);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");

  useEffect(() => {
    if (inspectorEvents.length > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [inspectorEvents]);

  // Counts for each filter tab
  const counts = useMemo(() => {
    let memory = 0;
    let guard = 0;
    let onchain = 0;

    for (const ev of inspectorEvents) {
      if (ev.type === "FETCH_MEMORY" || ev.type === "FALLBACK") memory++;
      else if (ev.type === "EVALUATE_RISK" || ev.type === "DECISION") guard++;
      else if (ev.type === "ONCHAIN_ACTION") onchain++;
    }

    return {
      all: inspectorEvents.length,
      memory,
      guard,
      onchain,
    };
  }, [inspectorEvents]);

  // Filter events according to active tab
  const filteredEvents = useMemo(() => {
    if (activeFilter === "ALL") return inspectorEvents;
    if (activeFilter === "MEMORY")
      return inspectorEvents.filter(
        (ev) => ev.type === "FETCH_MEMORY" || ev.type === "FALLBACK"
      );
    if (activeFilter === "GUARD")
      return inspectorEvents.filter(
        (ev) => ev.type === "EVALUATE_RISK" || ev.type === "DECISION"
      );
    if (activeFilter === "ONCHAIN")
      return inspectorEvents.filter((ev) => ev.type === "ONCHAIN_ACTION");
    return inspectorEvents;
  }, [inspectorEvents, activeFilter]);

  // Visual helper for tolerance
  const toleranceColor =
    riskProfile?.riskTolerance === "low"
      ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
      : riskProfile?.riskTolerance === "medium"
      ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
      : "text-purple-300 border-purple-500/30 bg-purple-500/10";

  return (
    <aside className="flex h-full w-full flex-col border-t border-white/10 bg-[#0e101a]/85 backdrop-blur-md lg:w-[430px] lg:border-t-0 lg:border-l">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 py-2 bg-black/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-sm shadow-purple-950/40">
            <Activity size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-100 flex items-center gap-2 font-mono">
              <span>Thought & Memory Inspector</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              Live SSE Stream {inspectorEvents.length > 0 && `• ${inspectorEvents.length} events`}
            </div>
          </div>
        </div>

        {inspectorEvents.length > 0 && (
          <button
            onClick={clearInspectorEvents}
            title="Clear inspector log"
            className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-rose-300 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Widget 2.0: Active Sibyl Memory Rules */}
      <div className="border-b border-white/10 bg-[#121422]/90 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-xs text-purple-200">
            <Database size={14} className="text-purple-400" />
            <span>Active Sibyl Memory Rules</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-[9px] text-purple-300 font-mono font-medium">
              Load-Bearing
            </span>
            {memorySource && (
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-mono border ${
                  memorySource.toLowerCase().includes("cloud") || memorySource.toLowerCase().includes("live")
                    ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-300"
                    : "border-amber-500/35 bg-amber-500/15 text-amber-300"
                }`}
              >
                {memorySource}
              </span>
            )}
          </div>
        </div>

        {riskProfile ? (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* Card 1: Tolerance */}
            <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-[10px] font-mono mb-1">
                <span className="flex items-center gap-1">
                  <Sliders size={11} className="text-purple-400" />
                  Tolerance
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono border ${toleranceColor}`}
                >
                  {riskProfile.riskTolerance}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Strict</span>
              </div>
            </div>

            {/* Card 2: Max Slippage */}
            <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-[10px] font-mono mb-1">
                <span className="flex items-center gap-1">
                  <Percent size={11} className="text-cyan-400" />
                  Max Slippage
                </span>
                <span className="font-bold text-zinc-200 font-mono">
                  {riskProfile.maxSlippagePercent}%
                </span>
              </div>
              <div className="w-full bg-zinc-800/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-purple-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(riskProfile.maxSlippagePercent * 20, 100)}%` }}
                />
              </div>
            </div>

            {/* Card 3: Max Budget */}
            <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-[10px] font-mono mb-1">
                <span className="flex items-center gap-1">
                  <DollarSign size={11} className="text-emerald-400" />
                  Max Budget
                </span>
              </div>
              <div className="text-xs font-bold text-zinc-100 font-mono">
                {riskProfile.maxBudgetPerTxUsdc}{" "}
                <span className="text-[10px] font-normal text-zinc-400">USDC</span>
              </div>
            </div>

            {/* Card 4: Unverified Tokens */}
            <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-[10px] font-mono mb-1">
                <span className="flex items-center gap-1">
                  <ShieldAlert
                    size={11}
                    className={
                      riskProfile.allowUnverifiedTokens ? "text-amber-400" : "text-emerald-400"
                    }
                  />
                  Unverified
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                    riskProfile.allowUnverifiedTokens
                      ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
                      : "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                  }`}
                >
                  {riskProfile.allowUnverifiedTokens ? "Allowed" : "Blocked"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-black/30 p-3 text-[11px] text-zinc-400 italic flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping" />
            <span>Connecting wallet to retrieve stored Sibyl Memory...</span>
          </div>
        )}

        {/* Interactive Event Filter Tabs */}
        <div className="flex items-center gap-1 pt-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all shrink-0 ${
              activeFilter === "ALL"
                ? "bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("MEMORY")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all shrink-0 ${
              activeFilter === "MEMORY"
                ? "bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            Memory ({counts.memory})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("GUARD")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all shrink-0 ${
              activeFilter === "GUARD"
                ? "bg-amber-600/30 text-amber-200 border border-amber-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            Guard ({counts.guard})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ONCHAIN")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all shrink-0 ${
              activeFilter === "ONCHAIN"
                ? "bg-cyan-600/30 text-cyan-200 border border-cyan-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            On-Chain ({counts.onchain})
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-3 overflow-y-auto p-3.5 scrollbar-thin scrollbar-thumb-zinc-800"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-zinc-500">
            <ShieldCheck size={36} className="mb-2 text-zinc-600" />
            <p className="text-xs font-medium text-zinc-300 font-mono">
              {activeFilter === "ALL" ? "Inspector Stream Idle" : `No ${activeFilter} Events`}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed max-w-[240px] text-zinc-400">
              {activeFilter === "ALL"
                ? "Memory queries, risk evaluations, and execution guards will stream live here."
                : "Switch filter to 'All' to view all incoming inspector events."}
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => <LogCard key={ev.id} event={ev} />)
        )}
      </div>
    </aside>
  );
}

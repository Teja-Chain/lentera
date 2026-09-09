"use client";

import { useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { siteConfig } from "@/config/site";

interface TransactionBadgeProps {
  txHash: string;
}

export function TransactionBadge({ txHash }: TransactionBadgeProps) {
  const [copied, setCopied] = useState(false);

  const truncated = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
  const explorerUrl = `${siteConfig.network.explorerUrl}/tx/${txHash}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 font-mono">
      <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span>Tx: {truncated}</span>
      <button
        onClick={copyToClipboard}
        title="Copy transaction hash"
        className="text-emerald-400 hover:text-emerald-200 transition-colors p-0.5"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="View on BaseScan Base Sepolia"
        className="text-emerald-400 hover:text-emerald-200 transition-colors p-0.5"
      >
        <ExternalLink size={12} />
      </a>
    </div>
  );
}

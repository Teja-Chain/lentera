export type InspectorEventType =
  | "FETCH_MEMORY"
  | "EVALUATE_RISK"
  | "DECISION"
  | "ONCHAIN_ACTION"
  | "FALLBACK";

export interface InspectorEvent {
  id: string;
  type: InspectorEventType;
  timestamp: string;
  title: string;
  data: Record<string, unknown> | string | number | boolean | null;
  status?: "approved" | "blocked" | "info" | "pending";
  txHash?: string;
  rawText?: string;
}

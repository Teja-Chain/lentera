import { TopBar } from "@/components/TopBar";
import { ChatPanel } from "@/components/ChatPanel";
import { MemoryPanel } from "@/components/MemoryPanel";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ChatPanel />
        <MemoryPanel />
      </div>
    </div>
  );
}

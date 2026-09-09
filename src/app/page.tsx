import { Header } from "@/components/common/Header";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { InspectorPanel } from "@/components/inspector/InspectorPanel";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col bg-[#090a10] overflow-hidden">
      <Header />
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left / Main Section: Chat Interface */}
        <section className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <ChatContainer />
        </section>

        {/* Right Section: Thought & Memory Inspector Stream */}
        <section className="flex h-1/2 lg:h-full shrink-0 min-h-0 overflow-hidden">
          <InspectorPanel />
        </section>
      </main>
    </div>
  );
}

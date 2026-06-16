import {
  mockConversationEvents,
  mockPresentationEvents,
} from "@/lib/mock/mockRealtimeEvents";

export default function DebugPage() {
  return (
    <main className="min-h-dvh bg-zinc-100 p-6 text-zinc-950">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-xl font-black">Mock 이벤트</h1>
        <pre className="overflow-auto rounded-[8px] border border-zinc-200 bg-white p-4 text-sm leading-6">
          {JSON.stringify(
            {
              conversation: mockConversationEvents,
              presentation: mockPresentationEvents,
            },
            null,
            2,
          )}
        </pre>
      </div>
    </main>
  );
}


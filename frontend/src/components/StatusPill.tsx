import type { RealtimeConnectionStatus } from "@/lib/types/realtime";

type StatusPillProps = {
  status: RealtimeConnectionStatus;
};

const statusLabels: Record<RealtimeConnectionStatus, string> = {
  idle: "대기",
  connecting: "연결 중",
  listening: "듣는 중",
  translating: "번역 중",
  reconnecting: "재연결 중",
  error: "오류",
  stopped: "중지됨",
};

const statusClasses: Record<RealtimeConnectionStatus, string> = {
  idle: "border-zinc-300 bg-white text-zinc-700",
  connecting: "border-amber-300 bg-amber-50 text-amber-800",
  listening: "border-emerald-300 bg-emerald-50 text-emerald-800",
  translating: "border-cyan-300 bg-cyan-50 text-cyan-800",
  reconnecting: "border-amber-300 bg-amber-50 text-amber-800",
  error: "border-red-300 bg-red-50 text-red-800",
  stopped: "border-zinc-300 bg-zinc-100 text-zinc-600",
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={`inline-flex h-8 min-w-20 items-center justify-center rounded-full border px-3 text-xs font-bold ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

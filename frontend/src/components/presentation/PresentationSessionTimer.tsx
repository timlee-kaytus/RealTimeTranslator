import { Clock, TriangleAlert } from "lucide-react";

type PresentationSessionTimerProps = {
  elapsedSeconds: number;
  maxSeconds: number;
  warningSeconds: number;
  running: boolean;
};

export function PresentationSessionTimer({
  elapsedSeconds,
  maxSeconds,
  warningSeconds,
  running,
}: PresentationSessionTimerProps) {
  const remainingSeconds = Math.max(0, maxSeconds - elapsedSeconds);
  const progress = Math.min(100, (elapsedSeconds / maxSeconds) * 100);
  const warning = running && remainingSeconds <= warningSeconds;

  return (
    <div className="space-y-3 rounded-[8px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-zinc-800">
          <Clock aria-hidden className="size-4 text-emerald-700" />
          세션 시간
        </div>
        <span className="text-sm font-black tabular-nums text-zinc-950">
          {formatDuration(elapsedSeconds)} / {formatDuration(maxSeconds)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className={`h-full rounded-full transition-all ${
            warning ? "bg-amber-500" : "bg-emerald-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {warning && (
        <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
          <TriangleAlert aria-hidden className="size-4" />
          세션 종료까지 {formatDuration(remainingSeconds)} 남았습니다.
        </div>
      )}
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}


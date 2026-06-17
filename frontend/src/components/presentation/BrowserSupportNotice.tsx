import { MonitorX } from "lucide-react";

export function BrowserSupportNotice() {
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
      <MonitorX aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p>
        발표 모드는 PC Chrome 또는 Edge에서만 지원됩니다.
        <br />
        모바일 및 현재 브라우저에서는 대화 모드를 사용해 주세요.
      </p>
    </div>
  );
}

import { MonitorX } from "lucide-react";
import { useUiLanguage } from "@/lib/i18n/uiLanguage";

export function BrowserSupportNotice() {
  const { t } = useUiLanguage();

  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
      <MonitorX aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p>
        {t("presentationUnsupportedLine1")}
        <br />
        {t("presentationUnsupportedLine2")}
      </p>
    </div>
  );
}

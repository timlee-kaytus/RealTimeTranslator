import { CircleAlert } from "lucide-react";

import {
  localizeRuntimeMessage,
  useUiLanguage,
} from "@/lib/i18n/uiLanguage";

type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  const { language } = useUiLanguage();

  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 rounded-[12px] border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{localizeRuntimeMessage(message, language)}</span>
    </div>
  );
}

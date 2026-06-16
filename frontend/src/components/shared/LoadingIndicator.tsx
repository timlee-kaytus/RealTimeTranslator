type LoadingIndicatorProps = {
  label: string;
};

export function LoadingIndicator({ label }: LoadingIndicatorProps) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600">
      <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
      {label}
    </span>
  );
}


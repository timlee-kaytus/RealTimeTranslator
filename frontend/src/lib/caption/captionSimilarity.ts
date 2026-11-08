const MIN_INCREMENTAL_CAPTION_LENGTH = 6;

export function isSameCaptionRevision(left: string, right: string): boolean {
  const normalizedLeft = normalizeCaptionForComparison(left);
  const normalizedRight = normalizeCaptionForComparison(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const shorter =
    normalizedLeft.length <= normalizedRight.length
      ? normalizedLeft
      : normalizedRight;
  const longer =
    normalizedLeft.length > normalizedRight.length
      ? normalizedLeft
      : normalizedRight;

  return (
    shorter.length >= MIN_INCREMENTAL_CAPTION_LENGTH &&
    longer.startsWith(shorter)
  );
}

function normalizeCaptionForComparison(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/gu, "")
    .replace(/[.,!?…;:，。！？；：'"“”‘’()[\]{}<>·•~-]/gu, "");
}

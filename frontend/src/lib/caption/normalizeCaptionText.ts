import type { SupportedLanguage } from "@/lib/types/language";

export function normalizeCaptionText(
  text: string,
  language?: SupportedLanguage,
): string {
  if (!text) {
    return "";
  }

  const normalizedText = text
    .replace(/[\t\f\v]+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\s+([,.!?;:%])/g, "$1")
    .replace(/\s+([，。！？；：])/g, "$1")
    .replace(/([!?])(?=[A-Za-z0-9가-힣\u3400-\u9fff])/g, "$1 ")
    .replace(/([。！？])(?=[A-Za-z0-9가-힣\u3400-\u9fff])/g, "$1 ")
    .replace(/([,;:])(?=[A-Za-z가-힣])/g, "$1 ")
    .replace(/([，；：])(?=[A-Za-z가-힣])/g, "$1 ")
    .replace(/ *\n */g, "\n");

  return normalizeKoreanSpacingBoundaries(
    normalizeSentenceBoundarySpacing(normalizedText),
    language,
  ).trim();
}

const koreanParticlePattern =
  "(?:은|는|이|가|을|를|에|에서|에게|의|도|만|와|과|로|으로)";
const latinTokenPattern = "[A-Za-z0-9][A-Za-z0-9./&+:-]*";
const hangulBeforeLatinPattern = /([가-힣])(?=[A-Za-z0-9])/gu;
const latinWithParticleBeforeHangulPattern = new RegExp(
  `(${latinTokenPattern})(${koreanParticlePattern})(?=[가-힣])`,
  "gu",
);
const latinBeforeHangulPattern = new RegExp(
  `(${latinTokenPattern})(?!(?:${koreanParticlePattern}))(?=[가-힣])`,
  "gu",
);
const koreanParticleBeforeClearBoundaryPattern = new RegExp(
  `([가-힣]{1,}?${koreanParticlePattern})(?=(?:우리|너희|저희|제가|그|그걸|그것|한|이|저|지금|현재|실제|더|다른|누가|누구|어떤|모델|시스템|정보|대안|배경|싸움|방식|버전|인터넷|사람|기업|연구소))`,
  "gu",
);
const koreanModifierBeforeClearBoundaryPattern =
  /(다음|이번|이전|현재|좋은|작은|큰|간단한|폐쇄형|오픈소스)(?=(?:그걸|그것|슬라이드|내용|장|페이지|주제|모델|시스템|버전|사례|싸움|방식|대안|아침))/gu;

function normalizeKoreanSpacingBoundaries(
  text: string,
  language?: SupportedLanguage,
): string {
  if (language !== "ko") {
    return text;
  }

  return text
    .replace(hangulBeforeLatinPattern, "$1 ")
    .replace(latinWithParticleBeforeHangulPattern, "$1$2 ")
    .replace(latinBeforeHangulPattern, "$1 ")
    .replace(koreanParticleBeforeClearBoundaryPattern, "$1 ")
    .replace(koreanModifierBeforeClearBoundaryPattern, "$1 ");
}

function normalizeSentenceBoundarySpacing(text: string): string {
  const characters = Array.from(text);
  let normalizedText = "";

  characters.forEach((character, index) => {
    normalizedText += character;

    const nextCharacter = characters[index + 1];

    if (!nextCharacter || /\s/u.test(nextCharacter)) {
      return;
    }

    if (character === "." && shouldInsertSpaceAfterPeriod(characters, index)) {
      normalizedText += " ";
      return;
    }

    if (
      (character === "!" ||
        character === "?" ||
        character === "。" ||
        character === "！" ||
        character === "？") &&
      startsSentenceLikeText(nextCharacter)
    ) {
      normalizedText += " ";
    }
  });

  return normalizedText;
}

function shouldInsertSpaceAfterPeriod(
  characters: string[],
  periodIndex: number,
): boolean {
  const previousCharacter = characters[periodIndex - 1] ?? "";
  const nextCharacter = characters[periodIndex + 1] ?? "";

  if (!startsSentenceLikeText(nextCharacter)) {
    return false;
  }

  if (isDigit(previousCharacter) && isDigit(nextCharacter)) {
    return false;
  }

  if (isDottedAcronymPeriod(characters, periodIndex)) {
    return false;
  }

  if (isProtectedAbbreviation(characters, periodIndex)) {
    return false;
  }

  return true;
}

function startsSentenceLikeText(character: string): boolean {
  return /[A-Z가-힣\u3400-\u9fff"“‘'([<{]/u.test(character);
}

function isDigit(character: string): boolean {
  return /[0-9]/u.test(character);
}

function isDottedAcronymPeriod(
  characters: string[],
  periodIndex: number,
): boolean {
  const previousCharacter = characters[periodIndex - 1] ?? "";
  const nextCharacter = characters[periodIndex + 1] ?? "";
  const characterBeforePrevious = characters[periodIndex - 2] ?? "";

  return (
    /[A-Z]/u.test(previousCharacter) &&
    /[A-Z]/u.test(nextCharacter) &&
    (characterBeforePrevious === "" ||
      characterBeforePrevious === "." ||
      /\s/u.test(characterBeforePrevious))
  );
}

function isProtectedAbbreviation(
  characters: string[],
  periodIndex: number,
): boolean {
  const textUntilPeriod = characters.slice(0, periodIndex + 1).join("");

  return /\b(?:e\.g|i\.e|vs|etc|mr|mrs|ms|dr|prof|sr|jr)\.$/iu.test(
    textUntilPeriod,
  );
}

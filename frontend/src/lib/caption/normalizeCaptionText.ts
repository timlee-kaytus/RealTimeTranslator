import type { SupportedLanguage } from "@/lib/types/language";

export function normalizeCaptionText(
  text: string,
  language?: SupportedLanguage,
): string {
  void language;

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

  return normalizeSentenceBoundarySpacing(normalizedText).trim();
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

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

  return normalizeKoreanWordSpacing(
    normalizeSentenceBoundarySpacing(normalizedText),
    language,
  ).trim();
}

const koreanParticlePattern =
  "(?:은|는|이|가|을|를|에게|에서|부터|까지|으로|로|와|과|도|만|에|의)";
const koreanPredicateStartPattern =
  "(?:제공|확인|검토|비교|소개|살펴|진행|지원|사용|구성|운영|관리|개발|배포|설계|연결|적용|가능|필요|정상|있|없|되|하|보|표시|출력|번역|인식|처리|생성|수정|개선|유지|포함|선택|시작|중지|종료|접속|구축|최적화|준비|공유|전달|요청|이동|확장|검증|분석|대응|설명|발생|완료|반영|높|낮|줄|늘)";
const koreanNounStartPattern =
  "(?:고객|솔루션|시스템|기능|언어|자막|화면|모드|세션|장표|자료|발표|환경|구성|설정|작업|내용|문장|단어|기술|제품|모델|서버|랙|클러스터|네트워크|스토리지|인프라|데이터|센터|플랫폼|서비스|리소스|성능|운영|배포|설계|지원|관리|개발|처리|번역|출력|입력|아키텍처|워크로드|토폴로지|프로세스|로드맵|냉각|전력|장비|문제|이슈|미팅|회의|자료|슬라이드|고밀도|저밀도)";
const koreanSpacingBoundaryPattern = `${koreanPredicateStartPattern}|${koreanNounStartPattern}`;
const latinTokenPattern = "[A-Za-z0-9][A-Za-z0-9./&+:-]*";
const latinTokenWithParticleBeforeKorean = new RegExp(
  `(${latinTokenPattern})(${koreanParticlePattern})(?=[가-힣])`,
  "gu",
);
const latinTokenWithParticleBeforeLatin = new RegExp(
  `(${latinTokenPattern})(${koreanParticlePattern})(?=[A-Za-z0-9])`,
  "gu",
);
const latinTokenBeforeKoreanWord = new RegExp(
  `(${latinTokenPattern})(?!(?:${koreanParticlePattern}))(?=[가-힣])`,
  "gu",
);
const koreanParticleBeforeLikelyWord = new RegExp(
  `([가-힣]{2,}?${koreanParticlePattern})(?=${koreanSpacingBoundaryPattern})`,
  "gu",
);
const koreanModifierBeforeLikelyNoun = new RegExp(
  `(하는|되는|있는|없는|같은|높은|낮은|빠른|새로운|기존|다음|이전|현재|주요|각|모든|전체|외부|내부|실시간|한국어|영어|중국어)(?=${koreanNounStartPattern})`,
  "gu",
);

function normalizeKoreanWordSpacing(
  text: string,
  language?: SupportedLanguage,
): string {
  if (language !== "ko") {
    return text;
  }

  return text
    .replace(latinTokenWithParticleBeforeLatin, "$1$2 ")
    .replace(latinTokenWithParticleBeforeKorean, "$1$2 ")
    .replace(latinTokenBeforeKoreanWord, "$1 ")
    .replace(/([가-힣])([A-Za-z0-9])/gu, "$1 $2")
    .replace(koreanParticleBeforeLikelyWord, "$1 ")
    .replace(koreanModifierBeforeLikelyNoun, "$1 ");
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

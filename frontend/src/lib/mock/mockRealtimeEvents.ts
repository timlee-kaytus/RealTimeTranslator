import type { SupportedLanguage } from "@/lib/types/language";
import type {
  ConversationCaptionEvent,
  PresentationCaptionEvent,
} from "@/lib/types/realtime";

type MockPhrase = {
  detectedLanguage: SupportedLanguage;
  text: Record<SupportedLanguage, string>;
};

const conversationPhrases: MockPhrase[] = [
  {
    detectedLanguage: "ko",
    text: {
      ko: "오늘 오후 3시에 고객 미팅이 있습니다.",
      en: "There is a customer meeting at 3 p.m. today.",
      zh: "今天下午三点有客户会议。",
    },
  },
  {
    detectedLanguage: "en",
    text: {
      ko: "발표 자료는 공유 드라이브에 올려 두었습니다.",
      en: "I uploaded the presentation to the shared drive.",
      zh: "我已经把演示资料上传到共享盘了。",
    },
  },
  {
    detectedLanguage: "zh",
    text: {
      ko: "이 문제는 품질팀과 함께 확인하겠습니다.",
      en: "We will review this issue with the quality team.",
      zh: "这个问题我们会和质量团队一起确认。",
    },
  },
  {
    detectedLanguage: "ko",
    text: {
      ko: "잠시 후에 액체 냉각 솔루션을 소개하겠습니다.",
      en: "We will introduce the liquid cooling solution shortly.",
      zh: "稍后我们将介绍液冷解决方案。",
    },
  },
];

const presentationPhrases: MockPhrase[] = [
  {
    detectedLanguage: "ko",
    text: {
      ko: "지금부터 KAYTUS 액체 냉각 솔루션을 소개하겠습니다.",
      en: "We will now introduce the KAYTUS liquid cooling solution.",
      zh: "现在我们将介绍 KAYTUS 液冷解决方案。",
    },
  },
  {
    detectedLanguage: "en",
    text: {
      ko: "이 아키텍처는 고밀도 AI 워크로드에 맞춰 설계되었습니다.",
      en: "This architecture is designed for high-density AI workloads.",
      zh: "该架构面向高密度 AI 工作负载设计。",
    },
  },
  {
    detectedLanguage: "zh",
    text: {
      ko: "다음 슬라이드에서는 운영 비용 절감 효과를 보겠습니다.",
      en: "On the next slide, we will review the operating cost savings.",
      zh: "下一页我们将查看运营成本节省效果。",
    },
  },
];

export const mockConversationEvents: ConversationCaptionEvent[] = [
  createMockConversationEvent(0, "zh", "ko"),
];

export const mockPresentationEvents: PresentationCaptionEvent[] = [
  createMockPresentationEvent(0, "en"),
];

export function createMockConversationEvent(
  index: number,
  topLanguage: SupportedLanguage,
  bottomLanguage: SupportedLanguage,
  sessionId = "mock-session",
): ConversationCaptionEvent {
  const phrase = conversationPhrases[index % conversationPhrases.length];
  const isFinal = index % 3 === 2;

  return {
    type: isFinal ? "caption_final" : "caption_delta",
    mode: "conversation",
    sessionId,
    detectedLanguage: phrase.detectedLanguage,
    top: {
      language: topLanguage,
      text: phrase.text[topLanguage],
    },
    bottom: {
      language: bottomLanguage,
      text: phrase.text[bottomLanguage],
    },
    isFinal,
    timestamp: new Date().toISOString(),
  };
}

export function createMockPresentationEvent(
  index: number,
  outputLanguage: SupportedLanguage,
  sessionId = "mock-session",
): PresentationCaptionEvent {
  const phrase = presentationPhrases[index % presentationPhrases.length];
  const isFinal = index % 3 === 2;

  return {
    type: isFinal ? "caption_final" : "caption_delta",
    mode: "presentation",
    sessionId,
    detectedLanguage: phrase.detectedLanguage,
    output: {
      language: outputLanguage,
      text: phrase.text[outputLanguage],
    },
    isFinal,
    timestamp: new Date().toISOString(),
  };
}


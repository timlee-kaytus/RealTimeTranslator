"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { SupportedLanguage } from "@/lib/types/language";

export type UiLanguage = SupportedLanguage;

const UI_LANGUAGE_STORAGE_KEY = "kaytus-rtt:ui-language";
const UI_LANGUAGE_CHANGE_EVENT = "kaytus-rtt:ui-language-change";

const koreanMessages = {
  appTitle: "실시간 번역 자막기",
  language: "언어",
  interpreterMode: "통역사 모드",
  presentationMode: "발표 모드",
  pptMode: "PPT 모드",
  logOut: "로그아웃",
  loggingOut: "로그아웃 중...",
  login: "로그인",
  loggingIn: "확인 중...",
  passwordPlaceholder: "비밀번호 입력",
  showPassword: "비밀번호 보기",
  hidePassword: "비밀번호 숨기기",
  passwordRequired: "비밀번호를 입력해 주세요.",
  loginConfigurationError: "로그인 설정을 확인해 주세요.",
  invalidPassword: "비밀번호가 올바르지 않습니다.",
  loginError: "로그인 중 오류가 발생했습니다.",
  conversationLogoAlt: "서로 다른 언어로 대화하는 두 사람",
  loginHeroAlt: "AI 실시간 번역 대화를 표현한 로그인 일러스트",
  interpreterIdle: "실시간 통역 대기 중",
  interpreterRequestingMicrophone: "마이크 권한 확인 중",
  interpreterConnecting: "통역 연결 중",
  interpreterListening: "듣는 중",
  interpreterUserSpeaking: "음성을 듣고 있습니다",
  interpreterInterpreting: "통역 중",
  interpreterAssistantSpeaking: "통역 음성 출력 중",
  interpreterMuted: "듣기 대기 중",
  interpreterReconnecting: "통역 세션 재연결 중",
  interpreterError: "연결 오류",
  interpreterStopped: "통역이 중지되었습니다",
  startListening: "듣기 시작",
  stopListening: "듣기 종료",
  clickToStartListening: "클릭하면 듣기를 시작합니다",
  clickToStopListening: "클릭하면 듣기를 종료합니다",
  interpreterConnectingAction: "통역 연결 중...",
  microphone: "마이크",
  microphoneInputLevel: "마이크 입력 레벨",
  startTranslation: "실시간 번역",
  stopTranslation: "통역 중지",
  activityIdle: "대기 중",
  activityConnecting: "연결 중입니다.",
  activityWarmingUp: "통역 준비 중입니다. 잠시 후 말해 주세요.",
  activityReady: "준비 완료. 이제 말하셔도 됩니다.",
  activityListening: "듣는 중입니다.",
  activitySpeechDetected: "말이 감지되었습니다.",
  activityTranslating: "번역 중입니다.",
  activityReconnecting: "재연결 중입니다.",
  activityError: "오류가 발생했습니다.",
  activityStopped: "중지됨",
  preview: "미리보기",
  captionSize: "자막 크기",
  decreaseFontSize: "글자 작게",
  fontSize: "글자 크기",
  increaseFontSize: "글자 크게",
  backgroundBrightness: "배경 밝기",
  decreaseTransparency: "투명도 낮춤",
  backgroundTransparency: "배경 투명도",
  increaseTransparency: "투명도 높임",
  outputLanguage1: "출력 언어 1",
  outputLanguage2: "출력 언어 2",
  none: "없음",
  floatingRefresh: "플로팅 갱신",
  floatingStart: "플로팅 시작",
  presentationBackdropView: "발표 배경 보기",
  presentationBackdropOpen: "발표 배경 열기",
  floatingDirectClickRequired:
    "플로팅 창은 브라우저가 인정한 직접 클릭에서만 열 수 있습니다.",
  floatingOpenFailed: "플로팅 자막창을 열지 못했습니다.",
  backdropPopupBlocked:
    "발표 배경창이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.",
  presentationIllustrationAlt: "발표 화면 위에 자막이 표시되는 일러스트",
  fullscreen: "전체 화면",
  viewFullscreen: "전체 화면으로 보기",
  language1: "언어 1",
  language2: "언어 2",
  captionWaiting: "자막 대기 중",
  presentationUnsupportedLine1:
    "발표 모드는 PC Chrome 또는 Edge에서만 지원됩니다.",
  presentationUnsupportedLine2:
    "모바일 및 현재 브라우저에서는 통역사 모드를 사용해 주세요.",
  selectPptFile: "PPT 파일 선택",
  changePptFile: "PPT 파일 변경",
  pptFileHint: "PPT 또는 PPTX 파일을 선택해 주세요. 파일은 브라우저 안에서만 처리됩니다.",
  pptLoading: "발표 자료를 불러오는 중입니다.",
  pptLoadFailed: "발표 자료를 열지 못했습니다. 파일이 손상되었거나 지원되지 않는 형식일 수 있습니다.",
  pptUnsupportedFile: "PPT 또는 PPTX 파일만 선택할 수 있습니다.",
  pptFileTooLarge: "파일 크기는 100MB 이하여야 합니다.",
  previousSlide: "이전 슬라이드",
  nextSlide: "다음 슬라이드",
  enterPptFullscreen: "PPT 전체 화면",
  fullscreenFailed: "전체 화면을 시작하지 못했습니다. 브라우저 권한을 확인해 주세요.",
  slideNavigationHint: "전체 화면에서는 좌우 방향키로 슬라이드를 이동할 수 있습니다.",
} as const;

export type UiMessageKey = keyof typeof koreanMessages;

const messages: Record<UiLanguage, Record<UiMessageKey, string>> = {
  ko: koreanMessages,
  en: {
    appTitle: "Real-Time Translation System",
    language: "Language",
    interpreterMode: "Interpreter Mode",
    presentationMode: "Presentation Mode",
    pptMode: "PPT Mode",
    logOut: "Log Out",
    loggingOut: "Logging Out...",
    login: "Log In",
    loggingIn: "Checking...",
    passwordPlaceholder: "Enter password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    passwordRequired: "Please enter your password.",
    loginConfigurationError: "Please check the login configuration.",
    invalidPassword: "The password is incorrect.",
    loginError: "An error occurred while logging in.",
    conversationLogoAlt: "Two people communicating in different languages",
    loginHeroAlt: "AI real-time translation conversation illustration",
    interpreterIdle: "Real-time interpretation is ready",
    interpreterRequestingMicrophone: "Checking microphone permission",
    interpreterConnecting: "Connecting interpreter",
    interpreterListening: "Listening",
    interpreterUserSpeaking: "Listening to the speaker",
    interpreterInterpreting: "Interpreting",
    interpreterAssistantSpeaking: "Playing interpretation audio",
    interpreterMuted: "Listening paused",
    interpreterReconnecting: "Reconnecting interpreter session",
    interpreterError: "Connection error",
    interpreterStopped: "Interpretation has stopped",
    startListening: "Start Listening",
    stopListening: "Stop Listening",
    clickToStartListening: "Click to start listening",
    clickToStopListening: "Click to stop listening",
    interpreterConnectingAction: "Connecting interpreter...",
    microphone: "Microphone",
    microphoneInputLevel: "Microphone input level",
    startTranslation: "Start Translation",
    stopTranslation: "Stop Translation",
    activityIdle: "Waiting",
    activityConnecting: "Connecting...",
    activityWarmingUp: "Preparing interpretation. Please speak shortly.",
    activityReady: "Ready. You may speak now.",
    activityListening: "Listening...",
    activitySpeechDetected: "Speech detected.",
    activityTranslating: "Translating...",
    activityReconnecting: "Reconnecting...",
    activityError: "An error occurred.",
    activityStopped: "Stopped",
    preview: "Preview",
    captionSize: "Caption Size",
    decreaseFontSize: "Decrease font size",
    fontSize: "Font size",
    increaseFontSize: "Increase font size",
    backgroundBrightness: "Background Brightness",
    decreaseTransparency: "Decrease transparency",
    backgroundTransparency: "Background transparency",
    increaseTransparency: "Increase transparency",
    outputLanguage1: "Output Language 1",
    outputLanguage2: "Output Language 2",
    none: "None",
    floatingRefresh: "Refresh Floating Window",
    floatingStart: "Open Floating Window",
    presentationBackdropView: "View Presentation Background",
    presentationBackdropOpen: "Open Presentation Background",
    floatingDirectClickRequired:
      "The floating window can only be opened from a direct browser click.",
    floatingOpenFailed: "Unable to open the floating caption window.",
    backdropPopupBlocked:
      "The presentation background window was blocked. Please allow pop-ups.",
    presentationIllustrationAlt:
      "Illustration of captions displayed over a presentation",
    fullscreen: "Full Screen",
    viewFullscreen: "View in full screen",
    language1: "Language 1",
    language2: "Language 2",
    captionWaiting: "Waiting for captions",
    presentationUnsupportedLine1:
      "Presentation Mode is supported only in Chrome or Edge on a PC.",
    presentationUnsupportedLine2:
      "Please use Interpreter Mode on mobile or in the current browser.",
    selectPptFile: "Select PPT File",
    changePptFile: "Change PPT File",
    pptFileHint: "Select a PPT or PPTX file. The file is processed only in your browser.",
    pptLoading: "Loading the presentation.",
    pptLoadFailed: "Unable to open the presentation. The file may be damaged or unsupported.",
    pptUnsupportedFile: "Only PPT or PPTX files can be selected.",
    pptFileTooLarge: "The file must be 100MB or smaller.",
    previousSlide: "Previous Slide",
    nextSlide: "Next Slide",
    enterPptFullscreen: "PPT Full Screen",
    fullscreenFailed: "Unable to enter full screen. Check your browser permissions.",
    slideNavigationHint: "Use the left and right arrow keys to move between slides in full screen.",
  },
  zh: {
    appTitle: "实时翻译系统",
    language: "界面语言",
    interpreterMode: "口译模式",
    presentationMode: "演讲模式",
    pptMode: "PPT 模式",
    logOut: "退出登录",
    loggingOut: "正在退出...",
    login: "登录",
    loggingIn: "正在确认...",
    passwordPlaceholder: "请输入密码",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",
    passwordRequired: "请输入密码。",
    loginConfigurationError: "请检查登录设置。",
    invalidPassword: "密码不正确。",
    loginError: "登录时发生错误。",
    conversationLogoAlt: "使用不同语言交流的两个人",
    loginHeroAlt: "AI 实时翻译对话插图",
    interpreterIdle: "实时口译等待中",
    interpreterRequestingMicrophone: "正在确认麦克风权限",
    interpreterConnecting: "正在连接口译服务",
    interpreterListening: "正在聆听",
    interpreterUserSpeaking: "正在聆听发言",
    interpreterInterpreting: "正在口译",
    interpreterAssistantSpeaking: "正在播放口译语音",
    interpreterMuted: "聆听已暂停",
    interpreterReconnecting: "正在重新连接口译会话",
    interpreterError: "连接错误",
    interpreterStopped: "口译已停止",
    startListening: "开始聆听",
    stopListening: "停止聆听",
    clickToStartListening: "点击后开始聆听",
    clickToStopListening: "点击后停止聆听",
    interpreterConnectingAction: "正在连接口译服务...",
    microphone: "麦克风",
    microphoneInputLevel: "麦克风输入音量",
    startTranslation: "开始翻译",
    stopTranslation: "停止翻译",
    activityIdle: "等待中",
    activityConnecting: "正在连接。",
    activityWarmingUp: "正在准备口译，请稍后开始讲话。",
    activityReady: "准备完成，现在可以讲话。",
    activityListening: "正在聆听。",
    activitySpeechDetected: "检测到语音。",
    activityTranslating: "正在翻译。",
    activityReconnecting: "正在重新连接。",
    activityError: "发生错误。",
    activityStopped: "已停止",
    preview: "预览",
    captionSize: "字幕大小",
    decreaseFontSize: "缩小文字",
    fontSize: "文字大小",
    increaseFontSize: "放大文字",
    backgroundBrightness: "背景亮度",
    decreaseTransparency: "降低透明度",
    backgroundTransparency: "背景透明度",
    increaseTransparency: "提高透明度",
    outputLanguage1: "输出语言 1",
    outputLanguage2: "输出语言 2",
    none: "无",
    floatingRefresh: "刷新悬浮窗",
    floatingStart: "打开悬浮窗",
    presentationBackdropView: "查看演讲背景",
    presentationBackdropOpen: "打开演讲背景",
    floatingDirectClickRequired: "悬浮窗只能通过浏览器直接点击打开。",
    floatingOpenFailed: "无法打开悬浮字幕窗口。",
    backdropPopupBlocked: "演讲背景窗口被拦截，请允许弹出窗口。",
    presentationIllustrationAlt: "演讲画面上显示字幕的插图",
    fullscreen: "全屏",
    viewFullscreen: "全屏查看",
    language1: "语言 1",
    language2: "语言 2",
    captionWaiting: "等待字幕",
    presentationUnsupportedLine1:
      "演讲模式仅支持电脑端 Chrome 或 Edge 浏览器。",
    presentationUnsupportedLine2:
      "在手机或当前浏览器中请使用口译模式。",
    selectPptFile: "选择 PPT 文件",
    changePptFile: "更换 PPT 文件",
    pptFileHint: "请选择 PPT 或 PPTX 文件。文件仅在浏览器中处理。",
    pptLoading: "正在加载演示文稿。",
    pptLoadFailed: "无法打开演示文稿。文件可能已损坏或不受支持。",
    pptUnsupportedFile: "只能选择 PPT 或 PPTX 文件。",
    pptFileTooLarge: "文件大小必须不超过 100MB。",
    previousSlide: "上一张幻灯片",
    nextSlide: "下一张幻灯片",
    enterPptFullscreen: "PPT 全屏",
    fullscreenFailed: "无法进入全屏模式，请检查浏览器权限。",
    slideNavigationHint: "全屏时可使用左右方向键切换幻灯片。",
  },
  ja: {
    appTitle: "リアルタイム翻訳システム",
    language: "表示言語",
    interpreterMode: "通訳モード",
    presentationMode: "プレゼンテーションモード",
    pptMode: "PPTモード",
    logOut: "ログアウト",
    loggingOut: "ログアウト中...",
    login: "ログイン",
    loggingIn: "確認中...",
    passwordPlaceholder: "パスワードを入力",
    showPassword: "パスワードを表示",
    hidePassword: "パスワードを非表示",
    passwordRequired: "パスワードを入力してください。",
    loginConfigurationError: "ログイン設定を確認してください。",
    invalidPassword: "パスワードが正しくありません。",
    loginError: "ログイン中にエラーが発生しました。",
    conversationLogoAlt: "異なる言語で会話する二人",
    loginHeroAlt: "AIリアルタイム翻訳会話のイラスト",
    interpreterIdle: "リアルタイム通訳待機中",
    interpreterRequestingMicrophone: "マイク権限を確認中",
    interpreterConnecting: "通訳に接続中",
    interpreterListening: "聞き取り中",
    interpreterUserSpeaking: "発言を聞いています",
    interpreterInterpreting: "通訳中",
    interpreterAssistantSpeaking: "通訳音声を再生中",
    interpreterMuted: "聞き取り一時停止中",
    interpreterReconnecting: "通訳セッションに再接続中",
    interpreterError: "接続エラー",
    interpreterStopped: "通訳を停止しました",
    startListening: "聞き取り開始",
    stopListening: "聞き取り停止",
    clickToStartListening: "クリックすると聞き取りを開始します",
    clickToStopListening: "クリックすると聞き取りを停止します",
    interpreterConnectingAction: "通訳に接続中...",
    microphone: "マイク",
    microphoneInputLevel: "マイク入力レベル",
    startTranslation: "リアルタイム翻訳",
    stopTranslation: "翻訳停止",
    activityIdle: "待機中",
    activityConnecting: "接続中です。",
    activityWarmingUp: "通訳を準備中です。しばらくしてからお話しください。",
    activityReady: "準備完了です。お話しいただけます。",
    activityListening: "聞き取り中です。",
    activitySpeechDetected: "音声を検出しました。",
    activityTranslating: "翻訳中です。",
    activityReconnecting: "再接続中です。",
    activityError: "エラーが発生しました。",
    activityStopped: "停止中",
    preview: "プレビュー",
    captionSize: "字幕サイズ",
    decreaseFontSize: "文字を小さくする",
    fontSize: "文字サイズ",
    increaseFontSize: "文字を大きくする",
    backgroundBrightness: "背景の明るさ",
    decreaseTransparency: "透明度を下げる",
    backgroundTransparency: "背景の透明度",
    increaseTransparency: "透明度を上げる",
    outputLanguage1: "出力言語 1",
    outputLanguage2: "出力言語 2",
    none: "なし",
    floatingRefresh: "フローティング画面を更新",
    floatingStart: "フローティング画面を開く",
    presentationBackdropView: "プレゼン背景を表示",
    presentationBackdropOpen: "プレゼン背景を開く",
    floatingDirectClickRequired:
      "フローティング画面はブラウザ上で直接クリックした場合のみ開けます。",
    floatingOpenFailed: "フローティング字幕画面を開けませんでした。",
    backdropPopupBlocked:
      "プレゼン背景画面がブロックされました。ポップアップを許可してください。",
    presentationIllustrationAlt: "プレゼン画面に字幕が表示されるイラスト",
    fullscreen: "全画面",
    viewFullscreen: "全画面で表示",
    language1: "言語 1",
    language2: "言語 2",
    captionWaiting: "字幕待機中",
    presentationUnsupportedLine1:
      "プレゼンテーションモードはPC版ChromeまたはEdgeのみ対応しています。",
    presentationUnsupportedLine2:
      "モバイルまたは現在のブラウザでは通訳モードをご利用ください。",
    selectPptFile: "PPTファイルを選択",
    changePptFile: "PPTファイルを変更",
    pptFileHint: "PPTまたはPPTXファイルを選択してください。ファイルはブラウザ内でのみ処理されます。",
    pptLoading: "プレゼンテーションを読み込んでいます。",
    pptLoadFailed: "プレゼンテーションを開けません。ファイルが破損しているか、未対応の形式です。",
    pptUnsupportedFile: "PPTまたはPPTXファイルのみ選択できます。",
    pptFileTooLarge: "ファイルサイズは100MB以下にしてください。",
    previousSlide: "前のスライド",
    nextSlide: "次のスライド",
    enterPptFullscreen: "PPTを全画面表示",
    fullscreenFailed: "全画面表示を開始できません。ブラウザの権限を確認してください。",
    slideNavigationHint: "全画面では左右の矢印キーでスライドを移動できます。",
  },
};

export const UI_LANGUAGE_NATIVE_LABELS: Record<UiLanguage, string> = {
  ko: "한국어",
  en: "English",
  zh: "中文",
  ja: "日本語",
};

const localizedLanguageNames: Record<
  UiLanguage,
  Record<SupportedLanguage, string>
> = {
  ko: { ko: "한국어", en: "영어", zh: "중국어", ja: "일본어" },
  en: { ko: "Korean", en: "English", zh: "Chinese", ja: "Japanese" },
  zh: { ko: "韩语", en: "英语", zh: "中文", ja: "日语" },
  ja: { ko: "韓国語", en: "英語", zh: "中国語", ja: "日本語" },
};

const runtimeMessageTranslations: Record<
  string,
  Partial<Record<UiLanguage, string>>
> = {
  "마이크 권한이 필요합니다. 브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요.": {
    en: "Microphone permission is required. Allow microphone access in your browser settings.",
    zh: "需要麦克风权限，请在浏览器设置中允许访问麦克风。",
    ja: "マイクの権限が必要です。ブラウザ設定でマイクへのアクセスを許可してください。",
  },
  "OpenAI 실시간 번역 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.": {
    en: "Failed to connect to OpenAI real-time translation. Please try again shortly.",
    zh: "OpenAI 实时翻译连接失败，请稍后重试。",
    ja: "OpenAIリアルタイム翻訳への接続に失敗しました。しばらくしてから再度お試しください。",
  },
  "OpenAI 실시간 통역 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.": {
    en: "Failed to connect to OpenAI real-time interpretation. Please try again shortly.",
    zh: "OpenAI 实时口译连接失败，请稍后重试。",
    ja: "OpenAIリアルタイム通訳への接続に失敗しました。しばらくしてから再度お試しください。",
  },
  "네트워크 연결이 불안정합니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.": {
    en: "The network connection is unstable. Check your internet connection and try again.",
    zh: "网络连接不稳定，请检查网络后重试。",
    ja: "ネットワーク接続が不安定です。インターネット接続を確認して再度お試しください。",
  },
  "마이크 권한을 확인하지 못했습니다.": {
    en: "Unable to verify microphone permission.",
    zh: "无法确认麦克风权限。",
    ja: "マイク権限を確認できませんでした。",
  },
  "듣기 상태를 변경하지 못했습니다. 통역 연결을 확인한 뒤 다시 시도해 주세요.": {
    en: "Unable to change the listening state. Check the interpreter connection and try again.",
    zh: "无法更改聆听状态，请检查口译连接后重试。",
    ja: "聞き取り状態を変更できませんでした。通訳接続を確認して再度お試しください。",
  },
  "통역 음성 자동 재생이 차단되었습니다. 다시 시작해 주세요.": {
    en: "Automatic playback of interpretation audio was blocked. Please restart.",
    zh: "口译音频自动播放被阻止，请重新开始。",
    ja: "通訳音声の自動再生がブロックされました。再度開始してください。",
  },
  "통역 음성 자동 재생이 차단되었습니다. 화면을 한 번 누른 후 다시 시작해 주세요.": {
    en: "Automatic playback of interpretation audio was blocked. Click the screen once and restart.",
    zh: "口译音频自动播放被阻止，请点击一次画面后重新开始。",
    ja: "通訳音声の自動再生がブロックされました。画面を一度クリックしてから再度開始してください。",
  },
  "현재 브라우저에서는 실시간 마이크 통역을 사용할 수 없습니다. 최신 Chrome 또는 Edge를 사용해 주세요.": {
    en: "Real-time microphone interpretation is not supported in this browser. Use the latest Chrome or Edge.",
    zh: "当前浏览器不支持实时麦克风口译，请使用最新版 Chrome 或 Edge。",
    ja: "現在のブラウザではリアルタイムマイク通訳を利用できません。最新版のChromeまたはEdgeをご利用ください。",
  },
  "현재 브라우저에서는 실시간 음성 통역을 사용할 수 없습니다. 최신 Chrome 또는 Edge를 사용해 주세요.": {
    en: "Real-time voice interpretation is not supported in this browser. Use the latest Chrome or Edge.",
    zh: "当前浏览器不支持实时语音口译，请使用最新版 Chrome 或 Edge。",
    ja: "現在のブラウザではリアルタイム音声通訳を利用できません。最新版のChromeまたはEdgeをご利用ください。",
  },
  "실시간 통역 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.": {
    en: "An error occurred during real-time interpretation. Please try again shortly.",
    zh: "实时口译过程中发生错误，请稍后重试。",
    ja: "リアルタイム通訳中にエラーが発生しました。しばらくしてから再度お試しください。",
  },
  "세션 시간이 만료되어 통역을 자동으로 중지했습니다.": {
    en: "The session expired, so interpretation stopped automatically.",
    zh: "会话已到期，口译已自动停止。",
    ja: "セッションの有効期限が切れたため、通訳を自動停止しました。",
  },
  "4시간 통역 이용 시간이 지나 세션을 종료했습니다. 다시 시작해 주세요.": {
    en: "The 4-hour interpretation limit has been reached. Please start a new session.",
    zh: "口译已达到 4 小时使用上限，请重新开始会话。",
    ja: "4時間の通訳利用上限に達しました。新しいセッションを開始してください。",
  },
  "4시간 세션 유지 시간이 지나 통역을 자동으로 중지했습니다. 다시 시작해 주세요.": {
    en: "The 4-hour session limit has been reached. Translation stopped automatically. Please restart.",
    zh: "会话已达到 4 小时上限，翻译已自动停止，请重新开始。",
    ja: "4時間のセッション上限に達したため、翻訳を自動停止しました。再度開始してください。",
  },
  "실시간 번역 세션 연장에 실패했습니다. 연결 상태를 확인하고 다시 시도해 주세요.": {
    en: "Failed to extend the real-time translation session. Check the connection and try again.",
    zh: "实时翻译会话续期失败，请检查连接后重试。",
    ja: "リアルタイム翻訳セッションの延長に失敗しました。接続を確認して再度お試しください。",
  },
  "마이크 오디오 트랙을 찾지 못했습니다.": {
    en: "No microphone audio track was found.",
    zh: "未找到麦克风音频轨道。",
    ja: "マイクの音声トラックが見つかりませんでした。",
  },
};

type UiLanguageContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: UiMessageKey) => string;
};

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null);

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribeToUiLanguage,
    getUiLanguageSnapshot,
    getUiLanguageServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = messages[language].appTitle;
  }, [language]);

  const setLanguage = useCallback((nextLanguage: UiLanguage) => {
    window.sessionStorage.setItem(UI_LANGUAGE_STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
    window.dispatchEvent(new Event(UI_LANGUAGE_CHANGE_EVENT));
  }, []);

  const t = useCallback(
    (key: UiMessageKey) => messages[language][key],
    [language],
  );
  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return (
    <UiLanguageContext.Provider value={value}>
      {children}
    </UiLanguageContext.Provider>
  );
}

export function useUiLanguage(): UiLanguageContextValue {
  const context = useContext(UiLanguageContext);

  if (!context) {
    throw new Error("useUiLanguage must be used within UiLanguageProvider.");
  }

  return context;
}

export function getLocalizedLanguageName(
  language: SupportedLanguage,
  uiLanguage: UiLanguage,
): string {
  return localizedLanguageNames[uiLanguage][language];
}

export function localizeRuntimeMessage(
  message: string,
  language: UiLanguage,
): string {
  if (language === "ko" || !message) {
    return message;
  }

  return runtimeMessageTranslations[message]?.[language] ?? message;
}

function isUiLanguage(value: string | null): value is UiLanguage {
  return value === "ko" || value === "en" || value === "zh" || value === "ja";
}

function subscribeToUiLanguage(onStoreChange: () => void) {
  window.addEventListener(UI_LANGUAGE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(UI_LANGUAGE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getUiLanguageSnapshot(): UiLanguage {
  const storedLanguage = window.sessionStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  return isUiLanguage(storedLanguage) ? storedLanguage : "ko";
}

function getUiLanguageServerSnapshot(): UiLanguage {
  return "ko";
}

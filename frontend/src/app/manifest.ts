import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "실시간 번역 자막기",
    short_name: "번역 자막기",
    description: "한국어, 영어, 중국어 실시간 번역 자막 PWA",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f6",
    theme_color: "#111827",
    icons: [
      {
        src: "/window.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}


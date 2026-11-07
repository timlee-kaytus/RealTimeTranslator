import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAYTUS RTT System",
    short_name: "KAYTUS RTT",
    description: "Real-time Korean, English, Chinese, and Japanese translation",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f6",
    theme_color: "#111827",
    icons: [
      {
        src: "/images/rtt-speaking-profile-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

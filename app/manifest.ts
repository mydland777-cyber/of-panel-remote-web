import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "O&F Panel",
    short_name: "O&F Panel",
    description: "O&F Panel Remote",
    start_url: "/",
    display: "standalone",
    background_color: "#1e1e1e",
    theme_color: "#1e1e1e",
    icons: [
      {
        src: "/of-panel-icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/of-panel-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
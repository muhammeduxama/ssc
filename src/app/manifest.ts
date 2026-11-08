import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Smart Servicing Centre", short_name: "Smart Servicing", description: "Bookings, mechanic jobs and messages in one app.", start_url: "/dashboard", scope: "/", display: "standalone", background_color: "#f8fafc", theme_color: "#1d4ed8",
    icons: [{ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
  };
}

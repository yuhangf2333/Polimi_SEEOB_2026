import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import "./homepage.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LIMEN",
  description: "Interactive Milan GIS decision-support platform.",
};

const STALE_BUILD_RECOVERY_SCRIPT = `
(function () {
  var storageKey = "limen:last-dashboard-runtime-error";
  var reloadKey = "limen:dashboard-runtime-reload";

  function toText(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value.message) return String(value.message);
    if (value.stack) return String(value.stack);
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  function record(reason, detail) {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          at: new Date().toISOString(),
          path: window.location.pathname,
          reason: reason,
          detail: detail,
        }),
      );
    } catch (error) {}
  }

  function isNextAssetUrl(url) {
    return typeof url === "string" && url.indexOf("/_next/") !== -1;
  }

  function isRecoverableChunkError(text) {
    return /ChunkLoadError|Loading chunk|CSS_CHUNK_LOAD_FAILED|dynamically imported module|module script failed|Failed to fetch/i.test(text);
  }

  function recover(reason, detail) {
    record(reason, detail);
    if (window.location.pathname.indexOf("/dashboard") !== 0) return;
    try {
      if (window.sessionStorage.getItem(reloadKey)) return;
      window.sessionStorage.setItem(reloadKey, "1");
    } catch (error) {
      return;
    }
    window.location.reload();
  }

  window.addEventListener(
    "error",
    function (event) {
      var target = event && event.target;
      var url = target && (target.src || target.href);
      if (isNextAssetUrl(url)) {
        recover("next-asset-load-error", {
          url: url,
          tagName: target && target.tagName,
        });
        return;
      }

      var text = toText(event.error || event.message);
      if (isRecoverableChunkError(text)) {
        recover("chunk-runtime-error", { message: text });
      } else if (text) {
        record("window-error", { message: text });
      }
    },
    true,
  );

  window.addEventListener("unhandledrejection", function (event) {
    var text = toText(event.reason);
    if (isRecoverableChunkError(text)) {
      recover("chunk-unhandled-rejection", { message: text });
    } else if (text) {
      record("unhandled-rejection", { message: text });
    }
  });
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Script
          id="limen-stale-build-recovery"
          strategy="beforeInteractive"
        >
          {STALE_BUILD_RECOVERY_SCRIPT}
        </Script>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

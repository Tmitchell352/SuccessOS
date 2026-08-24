import { useEffect, useRef } from "react";
import { adsConfigured, adsenseClientId, adsenseSlotId } from "../ads.js";
import { S } from "../theme.js";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadAdsenseScript(clientId: string): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-adsbygoogle="true"]');
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
    script.crossOrigin = "anonymous";
    script.dataset.adsbygoogle = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load AdSense script"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

// A single ad placement. Renders nothing unless ads are enabled AND a real
// AdSense client/slot ID is configured (see ads.ts) - there is no
// placeholder ad content shown to real users, since a fabricated ad slot
// would be either misleading or just noise. In dev mode with ads
// unconfigured, shows an explicit "not configured" marker instead, so it's
// obvious during development where ad placements exist without ever
// looking like a real or fake ad to an end user.
export function AdSlot({ label }: { label: string }) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!adsConfigured || !adsenseClientId) return;
    loadAdsenseScript(adsenseClientId)
      .then(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
          // AdSense throws if pushed before the script finishes initializing
          // in rare races - non-fatal, the slot just won't fill this time.
        }
      })
      .catch(() => {
        // Network-blocked or ad-blocked - fine, the slot just stays empty.
      });
  }, []);

  if (adsConfigured && adsenseClientId && adsenseSlotId) {
    return (
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", maxWidth: "560px", margin: "0 auto 16px" }}
        data-ad-client={adsenseClientId}
        data-ad-slot={adsenseSlotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    );
  }

  if (import.meta.env.DEV) {
    return (
      <div style={{ ...S.card, textAlign: "center", opacity: 0.6, fontSize: "0.85rem" }}>
        Ad slot ({label}) - not configured. Set VITE_ADS_ENABLED, VITE_ADSENSE_CLIENT_ID, and VITE_ADSENSE_SLOT_ID to enable.
      </div>
    );
  }

  return null;
}

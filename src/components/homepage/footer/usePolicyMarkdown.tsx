"use client";

import { useEffect, useState } from "react";
import { homeRedesignCopy } from "@/content/homeRedesignCopy";

export type PolicyStatus = "loading" | "ready" | "error";

export function usePolicyMarkdown(url: string, isOpen: boolean) {
  const [markdown, setMarkdown] = useState("");
  const [status, setStatus] = useState<PolicyStatus>("loading");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setStatus("loading");
    setMarkdown("");

    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (cancelled) return;
        setMarkdown(text);
        setStatus("ready");
      } catch (error) {
        console.error("Failed to load policy:", error);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, url]);

  return { markdown, status };
}

export function PolicyStatusMessage({
  status,
}: {
  status: Exclude<PolicyStatus, "ready">;
}) {
  if (status === "loading") {
    return (
      <p
        className="py-8 text-base font-semibold text-slate-700"
        role="status"
        aria-live="polite"
      >
        {homeRedesignCopy.loading}
      </p>
    );
  }

  return (
    <p className="py-8 text-base text-slate-700" role="alert">
      {homeRedesignCopy.policyLoadError}
    </p>
  );
}

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import si from "../src/messages/si.json";
import review from "./fixtures/approved-patient-sinhala.json";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) => createElement("img", { alt: props.alt }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
  }) => createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: () => undefined,
    back: () => undefined,
    refresh: () => undefined,
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, refreshUser: () => undefined }),
}));

vi.mock("@/components/common/CurrencyToggle", () => ({
  default: () => null,
}));

vi.mock("@/components/common/LanguageToggle", () => ({
  default: () => null,
}));

function renderSi(node: ReactNode) {
  return renderToStaticMarkup(
    createElement(NextIntlClientProvider, {
      locale: "si",
      messages: si as never,
      timeZone: "Asia/Colombo",
      children: node,
    })
  );
}

describe("Sinhala patient copy renders from the catalog", () => {
  it("shows the approved home page Sinhala", async () => {
    const { default: Body } = await import("../src/app/body/body");
    const html = renderSi(createElement(Body));
    // HOME-10 is the empty doctor list, which stays hidden behind the loading skeleton
    // until the doctor request finishes.
    for (const id of [
      "HOME-01",
      "HOME-02",
      "HOME-03",
      "HOME-04",
      "HOME-05",
      "HOME-06",
      "HOME-07",
      "HOME-08",
      "HOME-09",
      "HOME-11",
      "HOME-12",
      "HOME-13",
      "HOME-14",
      "HOME-15",
      "HOME-16",
    ]) {
      const row = review.applied.find((item) => item.id === id);
      expect(row, id).toBeTruthy();
      expect(html, id).toContain(row!.si);
    }
  });

  it("shows the approved header, dialog, and policy Sinhala", async () => {
    const { default: Header } = await import("../src/components/homepage/header/header");
    const { default: Modal } = await import("../src/components/atom/Modal/Modal");
    const { PolicyStatusMessage } = await import(
      "../src/components/homepage/footer/usePolicyMarkdown"
    );

    const header = renderSi(createElement(Header));
    expect(header).toContain(review.applied.find((row) => row.id === "MSG-02")!.si);
    expect(header).toContain(review.applied.find((row) => row.id === "MSG-03")!.si);
    expect(header).toContain(review.applied.find((row) => row.id === "HOME-01")!.si);

    const dialog = renderSi(
      createElement(Modal, { isOpen: true, onClose: () => undefined, children: "body" })
    );
    expect(dialog).toContain(review.applied.find((row) => row.id === "MSG-04")!.si);
    expect(dialog).toContain(review.applied.find((row) => row.id === "MSG-05")!.si);

    const loading = renderSi(createElement(PolicyStatusMessage, { status: "loading" }));
    const failed = renderSi(createElement(PolicyStatusMessage, { status: "error" }));
    expect(loading).toContain(review.applied.find((row) => row.id === "MSG-06")!.si);
    expect(failed).toContain(review.applied.find((row) => row.id === "MSG-07")!.si);
  });
});

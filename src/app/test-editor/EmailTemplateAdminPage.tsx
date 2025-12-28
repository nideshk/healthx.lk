"use client";

import { useEffect, useState } from "react";

type EmailTemplate = {
  id: string;
  name: string;
  description: string;
  html: string;
  allowed_variables: string[];
  required_variables: string[];
  updated_at: string;
};

function extractVariables(html: string): string[] {
  const matches = html.match(/{{(.*?)}}/g) || [];
  return matches.map((v) => v.replace(/[{}]/g, "").trim());
}

function renderTemplate(html: string, data: Record<string, any>) {
  return html.replace(/{{(.*?)}}/g, (_, key) => {
    return (
      key
        .split(".")
        .reduce((obj: any, k: any) => obj?.[k], data) ??
      `{{${key}}}`
    );
  });
}

function wrapEmailPreview(html: string) {
  return `
    <div>
      
        ${html}
    </div>
  `;
}

/* =======================
   Preview Data
======================= */
const PREVIEW_DATA = {
  greeting: "John",
  appointment: {
    practitionerName: "Dr. Smith",
    meetingUrl: "https://meet.example.com/room/123",
  },
  startTime: "10:00 AM",
  endTime: "10:30 AM",
};

/* =======================
   Page
======================= */
export default function EmailTemplateAdminPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  /* -------- Desktop check -------- */
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* -------- Fetch templates -------- */
  useEffect(() => {
    fetch("/api/template")
      .then((res) => res.json())
      .then(setTemplates)
      .catch(() => setError("Failed to load email templates"));
  }, []);

  function selectTemplate(template: EmailTemplate) {
    setSelected(template);
    setHtml(template.html);
    setError(null);
    setSuccess(null);
  }

  /* -------- Validation -------- */
  const usedVariables = extractVariables(html);

  const missingRequired =
    selected?.required_variables.filter(
      (v) => !usedVariables.includes(v)
    ) || [];

  const invalidVariables =
    usedVariables.filter(
      (v) => selected && !selected.allowed_variables.includes(v)
    ) || [];

  const isVisuallyValid =
    missingRequired.length === 0 && invalidVariables.length === 0;

  async function saveTemplate() {
    if (!selected || !isVisuallyValid) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selected.id, html }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(
        data.details
          ? `${data.error}: ${data.details.join(", ")}`
          : data.error
      );
      return;
    }

    setSuccess("Template saved successfully");
  }

  /* =======================
     MOBILE BLOCK
  ======================= */
  if (!isDesktop) {
    return (
      <div className="h-screen flex items-center justify-center  p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">
            Desktop Required
          </h1>
          <p className="text-gray-600 text-sm">
            Email templates can only be edited on a desktop device.
            Please switch to a larger screen to continue.
          </p>
        </div>
      </div>
    );
  }

  /* =======================
     DESKTOP LAYOUT
  ======================= */
  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* LEFT: Template list */}
      <aside className="w-72 border-r  p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          Email Templates
        </h2>
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              onClick={() => selectTemplate(t)}
              className={`cursor-pointer rounded-md p-3 border text-sm
                ${
                  selected?.id === t.id
                    ? "bg-blue-50 border-blue-300"
                    : "bg-white hover:bg-gray-100"
                }`}
            >
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-gray-500">
                {t.description}
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* RIGHT: Editor + Preview */}
      <main className="flex-1 p-6 overflow-hidden">
        {!selected ? (
          <div className="text-gray-500 text-sm">
            Select a template to edit
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* HTML Editor */}
            <div className="flex flex-col h-full">
              <h3 className="text-sm font-semibold mb-2">
                HTML Editor
              </h3>

              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="flex-1 font-mono text-sm border rounded-lg p-4 focus:outline-none focus:ring resize-none"
              />

              <div className="mt-4">
                {missingRequired.length > 0 && (
                  <p className="text-red-600 text-sm">
                    Missing required variables:{" "}
                    {missingRequired.join(", ")}
                  </p>
                )}
                {invalidVariables.length > 0 && (
                  <p className="text-red-600 text-sm">
                    Invalid variables:{" "}
                    {invalidVariables.join(", ")}
                  </p>
                )}
              </div>

              <button
                onClick={saveTemplate}
                disabled={loading || !isVisuallyValid}
                className={`mt-4 px-4 py-2 rounded-md text-sm text-white
                  ${
                    isVisuallyValid
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }
                `}
              >
                {loading ? "Saving..." : "Save Template"}
              </button>

              {success && (
                <p className="text-green-600 text-sm mt-2">
                  {success}
                </p>
              )}
              {error && (
                <p className="text-red-600 text-sm mt-2">
                  {error}
                </p>
              )}
            </div>

            {/* Email Preview */}
            <div className="flex flex-col h-full">
              <h3 className="text-sm font-semibold mb-2">
                Email Preview
              </h3>
              <div
                className="flex-1 border rounded-lg overflow-auto"
                dangerouslySetInnerHTML={{
                  __html: wrapEmailPreview(
                    renderTemplate(html, PREVIEW_DATA)
                  ),
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

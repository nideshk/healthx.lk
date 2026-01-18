"use client";

import { authFetch } from "@/lib/authFetch";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export default function FollowUpSummary() {
  const t = useTranslations("followUpSummary");

  const [count, setCount] = useState<number | null>(null);
  const [overdue, setOverdue] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchFollowUpStats() {
      try {
        const res = await authFetch("/api/follow-up");
        if (!res.ok) throw new Error();

        const data = await res.json();
        const items = data?.data ?? [];

        if (!mounted) return;

        setCount(items.length);
        setOverdue(
          items.filter(
            (i: any) =>
              i.follow_up_date && new Date(i.follow_up_date) < new Date()
          ).length
        );
      } catch {
        if (mounted) {
          setCount(0);
          setOverdue(0);
        }
      }
    }

    fetchFollowUpStats();
    return () => {
      mounted = false;
    };
  }, []);

  if (!count) return null;

  return (
    <Link
      href="/dashboard?tab=follow-up"
      className="block mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 hover:bg-yellow-100 transition"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-yellow-900">
          {t("title")}
        </span>
        <span className="rounded-full bg-yellow-600 px-2 py-0.5 text-xs text-white">
          {count}
        </span>
      </div>

      {overdue > 0 && (
        <p className="mt-1 text-xs text-red-600">
          {t("overdue", { count: overdue })}
        </p>
      )}
    </Link>
  );
}

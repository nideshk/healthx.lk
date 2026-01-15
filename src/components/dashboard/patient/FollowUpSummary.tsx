// components/FollowUpSummary.tsx
"use client";

import { authFetch } from "@/lib/authFetch";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function FollowUpSummary() {
  const [count, setCount] = useState<number | null>(null);
  const [overdue, setOverdue] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchFollowUpStats() {
      try {
        const res = await authFetch("/api/follow-up");

        if (!res.ok) {
          throw new Error(`Follow-up fetch failed: ${res.status}`);
        }

        const data = await res.json();
        const items = data?.data ?? [];

        if (!mounted) return;

        setCount(items.length);
        setOverdue(
          items.filter(
            (i: any) =>
              i.follow_up_date &&
              new Date(i.follow_up_date) < new Date()
          ).length
        );
      } catch (err) {
        console.error("Failed to load follow-up stats:", err);
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


  if (count === null || count === 0) return null;

  return (
    <Link
      href="/dashboard?tab=follow-up"
      className="block mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 hover:bg-yellow-100 transition"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-yellow-900">
          Follow-Ups
        </span>
        <span className="rounded-full bg-yellow-600 px-2 py-0.5 text-xs text-white">
          {count}
        </span>
      </div>

      {overdue > 0 && (
        <p className="mt-1 text-xs text-red-600">
          {overdue} overdue
        </p>
      )}
    </Link>
  );
}

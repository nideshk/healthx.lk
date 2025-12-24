"use client";

import { useEffect, useState } from "react";
import { AppointmentCard } from "../AppointmentCard";
import Loader from "@/components/atom/Loader/Loader";

export default function AppointmentTab() {
  const [ongoing, setOngoing] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [cancelled, setCancelled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/booking/appointment")
      .then((r) => r.json())
      .then((j) => {
        setOngoing(j.ongoing || []);
        setUpcoming(j.upcoming || []);
        setPast(j.past || []);
        setCancelled(j.cancelled || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) { 
    return <div className="w-[90vh] h-[90vh] flex justify-center items-center">
        <Loader size="lg"></Loader>;
    </div>
  }

  return (
    <div className="space-y-10">
      <Section title="Ongoing" items={ongoing}>
        {(a:any) => <AppointmentCard appt={a} isOngoing />}
      </Section>

      <Section title="Upcoming" items={upcoming}>
        {(a:any) => <AppointmentCard appt={a} />}
      </Section>

      <Section title="Past" items={past}>
        {(a:any) => <AppointmentCard appt={a} isPast />}
      </Section>

      <Section title="Cancelled" items={cancelled}>
        {(a:any) => <AppointmentCard appt={a} isCancelled />}
      </Section>
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({ title, items, children }: any) {
  return (
    <section>
      <div className="flex justify-between mb-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-sm text-gray-500">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600">No {title.toLowerCase()} appointments.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <div key={item.id}>{children(item)}</div>
          ))}
        </div>
      )}
    </section>
  );
}

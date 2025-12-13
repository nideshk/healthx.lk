import { Suspense } from "react";
import MeetingPage from "./MeetingClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
          <p>Preparing your consultation…</p>
        </div>
      }
    >
      <MeetingPage/>
    </Suspense>
  );
}

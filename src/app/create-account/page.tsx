import { Suspense } from "react";
import SignupForm from "@/components/form/SignupForm";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
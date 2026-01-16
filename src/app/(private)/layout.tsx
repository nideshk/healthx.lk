import { requireUser } from "@/lib/authGuard";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  return <>{children}</>;
}

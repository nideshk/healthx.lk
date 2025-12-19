import { requireUser } from "@/lib/authGuard";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const {authorized} = await requireUser();
  if( !authorized ){
      redirect("/")
  }
  return <>{children}</>;
}

// src\app\(private)\layout.tsx

import { redirect } from "next/navigation";
// import { cookies } from "next/headers"; // <-- CRITICAL IMPORT

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. CALL cookies() SYNCHRONOUSLY to get the cookie store object
  // const cookieStore = cookies();

  // // 2. Use the .get() method on the cookieStore object (ReadonlyRequestCookies)
  // const tokenCookie = cookieStore.get("sb-access-token");
  // const token = tokenCookie?.value;

  // if (!token) {
  //   redirect("/#");
  // }

  return <>{children}</>;
}

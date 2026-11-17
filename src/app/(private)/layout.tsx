// Signed-in routes read the locale cookie and search params. They stay dynamic.
export const dynamic = "force-dynamic";

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}

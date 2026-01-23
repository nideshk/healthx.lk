import AppHeader from "@/components/common/AppHeader";

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <AppHeader />
      {children}
    </div>
  );
}

// 🔥 CRITICAL: Completely empty layout
// Prevents parent (public) layout from rendering
// This isolates reset-password from Header component

export default function AuthRecoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

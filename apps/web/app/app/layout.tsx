import { AppShell } from "@/features/shell/AppShell";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  // Display-only: each page underneath still independently checks for
  // an access token and redirects to /login itself (on top of
  // proxy.ts's own guard), so this never needs to redirect -- if
  // there's no session, the page below throws that redirect before
  // this ever renders anything user-visible.
  const user = await getCurrentUser();

  return (
    <AppShell email={user?.email ?? null} roles={user?.roles ?? []}>
      {children}
    </AppShell>
  );
}

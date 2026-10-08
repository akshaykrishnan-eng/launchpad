import { AppShell } from "@/features/shell/AppShell";
import { getServerDashboard } from "@/lib/candidate/backend";
import { getAccessToken, getCurrentUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  // Display-only: each page underneath still independently checks for
  // an access token and redirects to /login itself (on top of
  // proxy.ts's own guard), so this never needs to redirect -- if
  // there's no session, the page below throws that redirect before
  // this ever renders anything user-visible.
  const [user, accessToken] = await Promise.all([getCurrentUser(), getAccessToken()]);

  // Used only to lock the Dashboard sidebar link for candidates who
  // have not yet completed the six core onboarding steps.  The proxy
  // already blocks /app itself, but /app/* sub-routes are accessible
  // and their AppShell sidebar would otherwise show Dashboard as a
  // normal destination.  Null/missing dashboard is treated as
  // incomplete (conservative: gate stays locked until confirmed open).
  const dashboard = accessToken ? await getServerDashboard(accessToken) : null;
  const isProfileComplete = dashboard?.next_action.type === "PROFILE_COMPLETE";

  return (
    <AppShell email={user?.email ?? null} roles={user?.roles ?? []} isProfileComplete={isProfileComplete}>
      {children}
    </AppShell>
  );
}

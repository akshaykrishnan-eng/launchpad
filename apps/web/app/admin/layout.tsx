import { redirect } from "next/navigation";

import { AdminShell } from "@/features/admin/AdminShell";
import { isAdminUser } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Frontend gate for a fast, clean redirect -- never the actual
  // security boundary. Every /api/admin/* call is independently
  // re-authorized server-side by FastAPI's require_admin dependency,
  // which re-reads the caller's role from the database on every
  // request (PRD section 6/46): a forged or stale client state here
  // can get a candidate redirected away, never past the real API.
  if (!isAdminUser(user)) {
    redirect("/app");
  }

  return <AdminShell email={user.email}>{children}</AdminShell>;
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { AdminErrorState } from "@/features/admin/AdminErrorState";
import { getServerAdminDashboard } from "@/lib/admin/backend";
import { getAccessToken } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/mock-interviews/labels";

function candidateName(c: { first_name: string | null; last_name: string | null; email: string }) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return name || c.email;
}

export default async function AdminDashboardPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const dashboard = await getServerAdminDashboard(accessToken);

  if (!dashboard) {
    return (
      <>
        <PageHeader title="Admin Dashboard" />
        <AdminErrorState message="We couldn't load the admin dashboard right now." />
      </>
    );
  }

  const { metrics, recent_candidates, recent_resume_reviews, recent_linkedin_reviews } = dashboard;

  const metricCards = [
    { label: "Total Candidates", value: metrics.total_candidates, href: "/admin/candidates" },
    { label: "Pending Resume Reviews", value: metrics.pending_resume_reviews, href: "/admin/resume-reviews" },
    { label: "Pending LinkedIn Reviews", value: metrics.pending_linkedin_reviews, href: "/admin/linkedin-reviews" },
    { label: "Upcoming Interviews", value: metrics.upcoming_interviews, href: "/admin/mock-interviews" },
    { label: "Completed Interviews", value: metrics.completed_interviews, href: "/admin/mock-interviews" },
    { label: "Credit Transactions", value: metrics.total_credit_transactions, href: "/admin/credits" },
  ];

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Operational overview of candidates, reviews, interviews, and credits."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {metricCards.map((card) => (
          <Link key={card.label} href={card.href} className="card card-clickable">
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{card.label}</p>
            <p style={{ fontSize: "2rem", fontWeight: 700, marginTop: "0.125rem" }}>{card.value}</p>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "2rem" }}>
        <Link href="/admin/candidates" className="btn-primary" style={{ display: "inline-flex" }}>
          View Candidates
        </Link>
        <Link href="/admin/resume-reviews" style={{ display: "inline-flex" }}>
          Review Resumes
        </Link>
        <Link href="/admin/linkedin-reviews" style={{ display: "inline-flex" }}>
          Review LinkedIn Profiles
        </Link>
        <Link href="/admin/mock-interviews" style={{ display: "inline-flex" }}>
          Manage Interview Slots
        </Link>
        <Link href="/admin/credits" style={{ display: "inline-flex" }}>
          Manage Credits
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Recently Registered</h2>
          {recent_candidates.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>No candidates yet.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recent_candidates.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/candidates/${c.id}`}
                    style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}
                  >
                    <span style={{ fontWeight: 600 }}>{candidateName(c)}</span>
                    <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                      {formatDateTime(c.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Recent Resume Reviews</h2>
          {recent_resume_reviews.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>No resume review requests yet.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recent_resume_reviews.map((item) => (
                <li key={item.review.id}>
                  <Link
                    href="/admin/resume-reviews"
                    style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}
                  >
                    <span style={{ fontWeight: 600 }}>{candidateName(item.candidate)}</span>
                    <span className={`badge ${item.review.status === "COMPLETED" ? "badge-success" : "badge-warning"}`}>
                      {item.review.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.875rem" }}>Recent LinkedIn Reviews</h2>
          {recent_linkedin_reviews.length === 0 ? (
            <p style={{ color: "var(--color-text-secondary)" }}>No LinkedIn review requests yet.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recent_linkedin_reviews.map((item) => (
                <li key={item.review.id}>
                  <Link
                    href="/admin/linkedin-reviews"
                    style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}
                  >
                    <span style={{ fontWeight: 600 }}>{candidateName(item.candidate)}</span>
                    <span className={`badge ${item.review.status === "COMPLETED" ? "badge-success" : "badge-warning"}`}>
                      {item.review.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

import { NAV_ITEMS, type NavItem } from "@/features/shell/navigation";

export type SearchEntry = NavItem & {
  keywords: string[];
};

// Additional search terms per destination. Each keyword is a phrase a
// candidate might type to mean that page, beyond the nav label itself.
const KEYWORD_MAP: Record<string, string[]> = {
  "/app":               ["home", "overview", "main"],
  "/app/profile":       ["update profile", "edit profile", "personal info", "about me", "my details"],
  "/app/resume":        ["resume centre", "resume center", "upload resume", "cv", "upload cv", "new resume"],
  "/app/linkedin":      ["linkedin centre", "linkedin center", "linkedin profile", "update linkedin", "add linkedin"],
  "/app/mock-interviews": ["mock interview", "interview practice", "book interview", "practice interview", "schedule interview"],
  "/app/credits":       ["view credits", "credit balance", "interview credits", "buy credits"],
  "/app/notifications": ["alerts", "updates", "messages", "unread"],
};

export const SEARCH_ENTRIES: SearchEntry[] = NAV_ITEMS.map((item) => ({
  ...item,
  keywords: KEYWORD_MAP[item.href] ?? [],
}));

/** Returns entries whose label or any keyword contains the query
 *  (case-insensitive substring match). */
export function searchEntries(query: string): SearchEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return SEARCH_ENTRIES;
  return SEARCH_ENTRIES.filter(
    (entry) =>
      entry.label.toLowerCase().includes(q) ||
      entry.keywords.some((kw) => kw.includes(q)),
  );
}

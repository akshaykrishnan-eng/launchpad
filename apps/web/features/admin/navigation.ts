import {
  CalendarIcon,
  CreditIcon,
  DashboardIcon,
  InterviewIcon,
  LinkedInIcon,
  ProfileIcon,
  ResumeIcon,
} from "@/components/icons";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: typeof DashboardIcon;
};

// Only implemented admin areas get a nav entry -- no recruiter/
// interviewer/career-coach portals, no job tooling (PRD section 4).
// Events & Webinars was added in Phase 12.
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/candidates", label: "Candidates", icon: ProfileIcon },
  { href: "/admin/resume-reviews", label: "Resume Reviews", icon: ResumeIcon },
  { href: "/admin/linkedin-reviews", label: "LinkedIn Reviews", icon: LinkedInIcon },
  { href: "/admin/mock-interviews", label: "Mock Interviews", icon: InterviewIcon },
  { href: "/admin/events", label: "Events & Webinars", icon: CalendarIcon },
  { href: "/admin/credits", label: "Credits", icon: CreditIcon },
];

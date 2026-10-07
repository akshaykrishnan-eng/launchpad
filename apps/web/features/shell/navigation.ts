import {
  BellIcon,
  CreditIcon,
  DashboardIcon,
  InterviewIcon,
  LinkedInIcon,
  ProfileIcon,
  ResumeIcon,
  SettingsIcon,
} from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: typeof DashboardIcon;
};

// Only modules that actually exist get a nav entry -- no placeholders
// for Events/Career Coaching/Jobs, which are still "Coming soon" cards
// on the dashboard itself, not real destinations.
export const OVERVIEW_NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: DashboardIcon },
];

export const CAREER_TOOLS_NAV_ITEMS: NavItem[] = [
  { href: "/app/profile", label: "Profile", icon: ProfileIcon },
  { href: "/app/resume", label: "Resume", icon: ResumeIcon },
  { href: "/app/linkedin", label: "LinkedIn", icon: LinkedInIcon },
  { href: "/app/mock-interviews", label: "Interviews", icon: InterviewIcon },
  { href: "/app/credits", label: "Credits", icon: CreditIcon },
  { href: "/app/notifications", label: "Notifications", icon: BellIcon },
];

// The one nav item with an unread-count pill (see
// features/notifications/NotificationBadge.tsx) -- checked by href in
// Sidebar.tsx rather than adding a per-item "badge" field that every
// other NavItem would have to declare as undefined.
export const NOTIFICATIONS_NAV_HREF = "/app/notifications";

export const NAV_ITEMS: NavItem[] = [...OVERVIEW_NAV_ITEMS, ...CAREER_TOOLS_NAV_ITEMS];

// The five primary destinations surfaced in the mobile bottom tab bar
// -- see features/shell/MobileBottomNav.tsx. Short labels keep each
// tab narrow enough at 375px width.
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Dashboard", shortLabel: "Home", icon: DashboardIcon },
  { href: "/app/profile", label: "Profile", icon: ProfileIcon },
  { href: "/app/resume", label: "Resume", icon: ResumeIcon },
  { href: "/app/linkedin", label: "LinkedIn", icon: LinkedInIcon },
  { href: "/app/mock-interviews", label: "Interviews", shortLabel: "Interview", icon: InterviewIcon },
];

// Appended only for ADMIN/SUPER_ADMIN (see Sidebar.tsx) -- the
// candidate shell's only entry point into the separate /admin area.
export const ADMIN_LINK_ITEM: NavItem = { href: "/admin", label: "Admin", icon: SettingsIcon };

import type { SVGProps } from "react";

/** Minimal hand-rolled icon set -- the project has no icon library and
 * this phase deliberately doesn't add one (see root README). Every
 * icon shares the same 20x20 viewBox, 1.75 stroke width, and rounded
 * caps/joins so they read as one consistent set at a glance. All are
 * `aria-hidden` by default since they're always paired with a visible
 * text label in this app; pass `aria-hidden={false}` with a `<title>`
 * for the rare icon-only usage. */
export type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.8 4.3-6 7.5-6s6.1 2.2 7.5 6" />
    </svg>
  );
}

export function ResumeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 15V4m0 0 4 4m-4-4-4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function LinkedInIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10.5v6M8 7.75v.01" />
      <path d="M12 16.5v-3.5c0-1.4 1-2.5 2.25-2.5S16.5 11.6 16.5 13v3.5" />
    </svg>
  );
}

export function InterviewIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3.5M9 21.5h6" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1.04-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.56 1.04h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.04Z" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function CreditIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v9M9.5 9.75c0-1 .9-1.75 2.5-1.75s2.5.6 2.5 1.5-.9 1.25-2.5 1.5-2.5.6-2.5 1.5.9 1.5 2.5 1.5 2.5-.75 2.5-1.75" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 2.4.7 4 1.5 5.25H4.5C5.3 14.5 6 12.9 6 10.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.5-4.5" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function GraduationCapIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M22 10L12 4 2 10l10 6 10-6z" />
      <path d="M7 13.5v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-5" />
      <path d="M22 10v5" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BriefcaseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="8.5" width="20" height="12" rx="2" />
      <path d="M16 8.5V7a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v1.5" />
      <path d="M2 13h20" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="2" width="18" height="20" rx="1.5" />
      <path d="M9 7h1.5M13.5 7H15M9 11h1.5M13.5 11H15M9 15h1.5M13.5 15H15" />
      <path d="M9.5 22v-4h5v4" />
    </svg>
  );
}

export function RocketIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 2c0 0-5 4-5 10v1l-2 3h14l-2-3v-1c0-6-5-10-5-10z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
      <path d="M7 13h10" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M5.636 5.636l2.121 2.121M16.243 16.243l2.121 2.121M5.636 18.364l2.121-2.121M16.243 7.757l2.121-2.121" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

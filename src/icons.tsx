import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const defaults = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function BranchIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx="6" cy="5" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="6" cy="19" r="2.5" />
      <path d="M6 7.5v9M8.5 17c5.2 0 7.8-2.8 7.8-8.5" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
      <path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 4.5 4.5" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M20.3 15.3A8.7 8.7 0 0 1 8.7 3.7a8.7 8.7 0 1 0 11.6 11.6Z" />
    </svg>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export function WrapIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M4 7h11a4 4 0 0 1 0 8H9" />
      <path d="m12 12-3 3 3 3M4 11h5" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M6 2.5h8l4 4V21H6z" />
      <path d="M14 2.5v4h4" />
    </svg>
  );
}

export function SidebarIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="m8 10 4 4 4-4" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function FilesIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M8 3h8l4 4v12H8z" />
      <path d="M16 3v4h4M4 7v14h12" />
    </svg>
  );
}

export function TreeIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M5 4v12a2 2 0 0 0 2 2h2M5 10h4" />
      <rect x="10" y="7" width="9" height="6" rx="1.5" />
      <rect x="10" y="15" width="9" height="6" rx="1.5" />
    </svg>
  );
}

export function FlatListIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

export function CollapseAllIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="m7 9 5-5 5 5M7 15l5 5 5-5" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...defaults} {...props}>
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  );
}

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

/** Serving cloche from the design's header, with the orange steam dot. */
export function LogoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden {...props}>
      <g
        stroke="var(--green)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="24" cy="9.5" r="2.6" />
        <path d="M7.5 33a16.5 16.5 0 0 1 33 0" />
        <path d="M13.5 26.5a11 11 0 0 1 5-6" />
        <path d="M4 33.5h40" />
        <path d="M11 38.5h26l-3 3.5H14z" />
      </g>
      <circle cx="33.5" cy="6.5" r="3" fill="var(--orange)" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <circle cx="8.5" cy="7.5" r="3.5" />
      <circle cx="16.5" cy="8.5" r="2.8" />
      <path d="M1.5 19.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5V21h-14z" />
      <path d="M16.6 13c3.3 0 5.9 2.4 5.9 5.6V21h-5.4v-1.5c0-2.6-1-4.9-2.7-6.4.7-.1 1.4-.1 2.2-.1z" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
      <path d="M9 14.5v2M14 14.5v2" strokeWidth="2.6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
      {...props}
    >
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5" />
      <path d="M10.3 10.5v6M13.7 10.5v6" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      {...props}
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

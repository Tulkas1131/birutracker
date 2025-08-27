import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10 21h4" />
      <path d="M10 3h4" />
      <path d="M14 3v2" />
      <path d="M10 3v2" />
      <path d="M18 8v8c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2Z" />
      <path d="M10 12h4" />
      <path d="M12 10v4" />
    </svg>
  );
}

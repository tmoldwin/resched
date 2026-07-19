type LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export default function Logo({ className = "", showWordmark = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        width="28"
        height="28"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="4"
          y="6"
          width="24"
          height="22"
          rx="4"
          fill="#16a34a"
        />
        <rect x="4" y="6" width="24" height="7" rx="4" fill="#15803d" />
        <rect x="4" y="10" width="24" height="3" fill="#15803d" />
        <rect x="9" y="3.5" width="2.5" height="6" rx="1.25" fill="#166534" />
        <rect x="20.5" y="3.5" width="2.5" height="6" rx="1.25" fill="#166534" />

        {/* Refresh arrows */}
        <path
          d="M11.2 18.2a5.2 5.2 0 0 1 8.1-3.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M17.8 12.2l1.7 2.8 2.7-1.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20.8 19.8a5.2 5.2 0 0 1-8.1 3.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14.2 25.8l-1.7-2.8-2.7 1.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark ? (
        <span className="text-base font-semibold tracking-tight text-zinc-900">
          resched
        </span>
      ) : null}
    </span>
  );
}

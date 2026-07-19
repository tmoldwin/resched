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
        <rect x="4" y="6" width="24" height="22" rx="4" fill="#16a34a" />
        <rect x="4" y="6" width="24" height="7" rx="4" fill="#15803d" />
        <rect x="4" y="10" width="24" height="3" fill="#15803d" />
        <rect x="9" y="3.5" width="2.5" height="6" rx="1.25" fill="#166534" />
        <rect x="20.5" y="3.5" width="2.5" height="6" rx="1.25" fill="#166534" />

        {/* Clockwise refresh arcs */}
        <path
          d="M10.8 20a5.4 5.4 0 0 1 7.6-5.1"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M21.2 19a5.4 5.4 0 0 1-7.6 5.1"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.7"
          strokeLinecap="round"
        />

        {/* Arrowheads: right tip on top arc, left tip on bottom arc */}
        <path d="M18.2 13.1 21.8 15.0 18.2 16.9Z" fill="#ffffff" />
        <path d="M13.8 25.9 10.2 24.0 13.8 22.1Z" fill="#ffffff" />
      </svg>
      {showWordmark ? (
        <span className="font-brand text-[1.05rem] font-semibold tracking-[-0.03em] text-zinc-900">
          Resched
        </span>
      ) : null}
    </span>
  );
}

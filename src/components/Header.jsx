import aragonLogo from '../assets/aragonlogo.png'

/**
 * Global top bar: blue/purple neon branding + spinning tech rings with logo centered inside.
 */
export default function Header({ pageTitle }) {
  return (
    <header className="relative z-50 border-b border-cyan-500/20 bg-slate-950/95 shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)] backdrop-blur-md">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'linear-gradient(90deg, rgba(34,211,238,0.12) 0%, rgba(139,92,246,0.18) 50%, rgba(232,121,249,0.12) 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

      <div className="relative mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:gap-5 sm:px-6 sm:py-3.5">
        <div className="relative h-16 w-16 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]">
          {/* Outer tech ring */}
          <svg
            className="absolute inset-0 h-full w-full drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <defs>
              <linearGradient id="aragon-ring-outer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="45%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#e879f9" />
              </linearGradient>
            </defs>
            <g transform="translate(50 50)">
              <g className="aragon-ring-outer">
                <circle
                  cx="0"
                  cy="0"
                  r="46"
                  fill="none"
                  stroke="url(#aragon-ring-outer)"
                  strokeWidth="2.5"
                  strokeDasharray="14 10"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </svg>
          {/* Inner counter-rotating ring */}
          <svg
            className="absolute inset-[6%] h-[88%] w-[88%] text-violet-400/85"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <defs>
              <linearGradient id="aragon-ring-inner" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <g transform="translate(50 50)">
              <g className="aragon-ring-inner">
                <circle
                  cx="0"
                  cy="0"
                  r="44"
                  fill="none"
                  stroke="url(#aragon-ring-inner)"
                  strokeWidth="1.75"
                  strokeDasharray="8 12"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </svg>
          {/* Logo sits inside the ring */}
          <div className="absolute inset-[18%] overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/15 ring-inset">
            <img
              src={aragonLogo}
              alt="Aragon"
              className="h-full w-full scale-95 object-contain object-center"
              draggable={false}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300/90 sm:text-[11px]">
            Aragon
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 bg-clip-text text-xl font-semibold tracking-tight text-transparent sm:text-2xl">
              Platform
            </h1>
            {pageTitle ? (
              <span className="truncate text-sm font-medium text-slate-400 sm:text-base">
                {pageTitle}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}

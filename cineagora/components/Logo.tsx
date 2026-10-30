/** Ingresso de cinema com picote e um "play" vazado: a sessão começa agora. */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" aria-hidden="true" className={className}>
      <path
        fill="var(--color-projetor)"
        d="M5 0h38a5 5 0 0 1 5 5v6.5a4.5 4.5 0 0 0 0 9V27a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5v-6.5a4.5 4.5 0 0 0 0-9V5a5 5 0 0 1 5-5Z"
      />
      {/* Picote: separa o canhoto do ingresso. */}
      <g fill="var(--color-veludo)">
        <circle cx="14" cy="6" r="1.4" />
        <circle cx="14" cy="12.7" r="1.4" />
        <circle cx="14" cy="19.3" r="1.4" />
        <circle cx="14" cy="26" r="1.4" />
        <path d="M24.5 9.2v13.6a1.2 1.2 0 0 0 1.8 1l10.9-6.8a1.2 1.2 0 0 0 0-2L26.3 8.2a1.2 1.2 0 0 0-1.8 1Z" />
      </g>
    </svg>
  );
}

export function Logo({ size = 'md' }: { size?: 'md' | 'sm' }) {
  const md = size === 'md';
  return (
    <span className="inline-flex items-center gap-2 sm:gap-2.5">
      <LogoMark className={md ? 'h-6 w-auto sm:h-8' : 'h-6 w-auto'} />
      <span
        className={`font-display leading-none font-black tracking-[0.02em] text-tela uppercase ${
          md ? 'text-[1.45rem] sm:text-[1.85rem]' : 'text-xl'
        }`}
      >
        CineAgora
      </span>
    </span>
  );
}

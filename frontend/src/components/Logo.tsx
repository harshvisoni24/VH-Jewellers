/** Crown, VH monogram and spaced "JEWELLERS". Inherits its colour from the parent (text-gold). */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <svg width="26" height="15" viewBox="0 0 26 15" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 13 2 4.5 8 9 13 2.5 18 9 24 4.5 23 13Z" /><path d="M3 13h20" />
        <circle cx="2" cy="3.5" r="1" fill="currentColor" stroke="none" /><circle cx="13" cy="1.6" r="1" fill="currentColor" stroke="none" /><circle cx="24" cy="3.5" r="1" fill="currentColor" stroke="none" />
      </svg>
      <span className="mt-1 font-display text-[2rem] font-medium tracking-[0.06em]">VH</span>
      <span className="mt-1 pl-[0.45em] font-crest text-[0.6rem] tracking-[0.45em]">JEWELLERS</span>
    </span>
  );
}

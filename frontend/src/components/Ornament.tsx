/** A fine line, a small diamond, a fine line. `tone="cream"` is the darker gold used on the light section. */
export default function Ornament({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "cream" }) {
  const cream = tone === "cream";
  return (
    <div aria-hidden="true" className={`flex items-center justify-center gap-3 ${className}`}>
      <span className={`h-px w-16 bg-gradient-to-r from-transparent ${cream ? "to-gold-dark/70" : "to-gold/70"}`} />
      <span className={`h-1.5 w-1.5 rotate-45 ${cream ? "bg-gold-dark" : "bg-gold"}`} />
      <span className={`h-px w-16 bg-gradient-to-l from-transparent ${cream ? "to-gold-dark/70" : "to-gold/70"}`} />
    </div>
  );
}

import Ornament from "./Ornament";

/** Centered section heading: small overline, ornament, large serif title. */
export default function SectionTitle({ title, eyebrow, tone = "dark", as: H = "h2", className = "" }: { title: string; eyebrow?: string; tone?: "dark" | "cream"; as?: "h1" | "h2"; className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      {eyebrow && <p className={`eyebrow ${tone === "cream" ? "!text-gold-dark" : ""}`}>{eyebrow}</p>}
      <Ornament tone={tone} className={eyebrow ? "mb-3 mt-3" : "mb-4"} />
      <H className={`text-4xl sm:text-5xl ${tone === "cream" ? "!text-night" : ""}`}>{title}</H>
    </div>
  );
}

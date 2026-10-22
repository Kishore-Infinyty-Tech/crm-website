import Image from "next/image";

// Full logo is 1812x310, the infinity mark alone is 756x310, the white word is 984x209.
// Width and height attributes always match the size it is drawn at, so no layout shift or warnings.
const RATIO = { full: 1812 / 310, mark: 756 / 310 };

export function Logo({ variant = "full", height = 36, className, priority }: { variant?: "full" | "mark"; height?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src={variant === "full" ? "/logo.png" : "/logo-mark.png"}
      alt="Infinyty"
      width={Math.round(height * RATIO[variant])}
      height={height}
      priority={priority}
      className={className}
    />
  );
}

/** The logo for dark backgrounds: coloured mark with a white word. */
export function LogoOnDark({ height = 36, className }: { height?: number; className?: string }) {
  const wordHeight = Math.round(height * 0.68);
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`} style={{ height }}>
      <Image src="/logo-mark.png" alt="" width={Math.round(height * RATIO.mark)} height={height} priority />
      <Image src="/logo-word-white.png" alt="Infinyty" width={Math.round(wordHeight * (984 / 209))} height={wordHeight} priority />
    </span>
  );
}

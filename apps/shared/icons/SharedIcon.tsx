import type { CSSProperties } from "react";
import { getSharedIconSrc, type SharedIconName } from "./iconRegistry";

export type { SharedIconName } from "./iconRegistry";

export type SharedIconProps = {
  name: SharedIconName;
  alt?: string;
  decorative?: boolean;
  className?: string;
  size?: number;
};

export function SharedIcon({
  name,
  alt,
  decorative = false,
  className = "sharedIcon",
  size = 24,
}: SharedIconProps) {
  const accessibilityProps = decorative
    ? ({ alt: "", "aria-hidden": true } as const)
    : ({ alt: alt ?? name } as const);
  const style = { "--shared-icon-size": `${size}px` } as CSSProperties;

  return (
    <img
      className={className}
      src={getSharedIconSrc(name)}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      style={style}
      {...accessibilityProps}
    />
  );
}

export function SharedIconBox({ name, label }: { name: SharedIconName; label?: string }) {
  return (
    <span className="iconBox" role={label ? "img" : undefined} aria-hidden={label ? undefined : true} aria-label={label}>
      <SharedIcon name={name} alt={label} decorative={!label} size={22} />
    </span>
  );
}

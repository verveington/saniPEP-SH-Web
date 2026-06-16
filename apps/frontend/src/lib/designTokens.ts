export const designTokens = {
  color: {
    brand: "#0f6f62",
    brandStrong: "#08483f",
    brandSoft: "#e5f4f0",
    coral: "#e85b48",
    coralSoft: "#fff0ed",
    graphite: "#18232f",
    muted: "#68737d",
    line: "#dbe6e1",
    page: "#f7faf8",
    white: "#ffffff",
    warning: "#a86b00",
    success: "#167a55",
    critical: "#b42318",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
  },
  shadow: {
    panel: "0 18px 44px rgba(24, 35, 47, 0.10)",
    subtle: "0 8px 22px rgba(24, 35, 47, 0.07)",
  },
  spacing: {
    page: "clamp(20px, 4vw, 56px)",
    section: "clamp(56px, 8vw, 112px)",
  },
} as const;

export const designLabPalettes = {
  trust: {
    label: "Trust medical",
    background: "#f7faf8",
    primary: "#0f6f62",
    action: "#e85b48",
    surface: "#ffffff",
  },
  precision: {
    label: "Precision graphite",
    background: "#f4f7f7",
    primary: "#244d5a",
    action: "#d94f3d",
    surface: "#ffffff",
  },
  warmCare: {
    label: "Warm care",
    background: "#fbfaf7",
    primary: "#35695d",
    action: "#c55c45",
    surface: "#ffffff",
  },
} as const;

export type DesignLabPalette = keyof typeof designLabPalettes;

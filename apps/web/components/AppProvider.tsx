"use client";

import type { ReactNode } from "react";
import { Reshaped } from "reshaped";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <Reshaped defaultTheme="slate" defaultColorMode="light">
      {children}
    </Reshaped>
  );
}

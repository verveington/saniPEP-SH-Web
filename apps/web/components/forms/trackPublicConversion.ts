"use client";

import { createConversionEvent } from "@frontend/lib/conversionFunnel";
import type { ConversionStage, Route } from "@frontend/lib/types";

let conversionSequence = 0;

export const trackPublicConversion = (input: { stage: ConversionStage; route: Route }) => {
  conversionSequence += 1;
  return createConversionEvent(input, conversionSequence);
};

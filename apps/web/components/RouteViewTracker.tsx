"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Route } from "@frontend/lib/types";
import { isPublicRoute } from "../lib/routes/publicRoutes";
import { trackPublicConversion } from "./forms/trackPublicConversion";

export function RouteViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const route = pathname as Route;
    if (isPublicRoute(route)) {
      trackPublicConversion({ stage: "route-view", route });
    }
  }, [pathname]);

  return null;
}

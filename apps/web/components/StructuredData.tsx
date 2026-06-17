import type { Route } from "@frontend/lib/types";
import { buildStructuredData } from "../lib/seo/structuredData";

export function StructuredData({ route }: { route: Route }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStructuredData(route)) }}
    />
  );
}

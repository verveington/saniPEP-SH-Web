import type { ReactNode } from "react";
import type { Metadata } from "next";
import "reshaped/bundle.css";
import "reshaped/themes/slate/theme.css";
import "../../frontend/src/styles/global.css";
import "./public-site.css";
import { designTokenCssText } from "../../shared/design/saniPepDesignTokens";
import { AppProvider } from "../components/AppProvider";
import { PublicLayout } from "../components/PublicLayout";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.sanipep.de"),
  title: {
    default: "saniPEP Sanitätshaus München | Beratung & Versorgung",
    template: "%s",
  },
  description:
    "Sanitätshaus in München für Kompression, Brustprothetik, Bandagen, Orthesen, Inkontinenz, Pflegehilfsmittel, Rezeptupload und Terminanfrage.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" dir="ltr" data-rs-theme="slate" data-rs-color-mode="light">
      <head>
        <style id="sani-design-tokens" dangerouslySetInnerHTML={{ __html: designTokenCssText }} />
      </head>
      <body>
        <AppProvider>
          <PublicLayout>{children}</PublicLayout>
        </AppProvider>
      </body>
    </html>
  );
}

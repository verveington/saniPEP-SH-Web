import Link from "next/link";
import type { ReactNode } from "react";
import { Text, View } from "reshaped";
import { portalLoginHref } from "../lib/routes/publicRoutes";
import { verifiedAddress, verifiedContact } from "../lib/verifiedContact";
import { RouteViewTracker } from "./RouteViewTracker";
import { SiteHeader } from "./SiteHeader";

function SiteFooter() {
  return (
    <footer className="footer">
      <div className="sectionInner">
        <div className="footerGrid">
          <View direction="column" gap={2}>
            <img
              className="footerLogo"
              src="/brand/sanipep-sanitaetshaus-logo.svg"
              width={164}
              height={56}
              alt="saniPEP Sanitätshaus"
            />
            <Text variant="body-2" color="neutral-faded">
              {verifiedAddress} · {verifiedContact.phone} · {verifiedContact.email}
            </Text>
            <Text variant="body-2" color="neutral-faded">
              Parteiverkehr seit {verifiedContact.serviceHoursEffectiveFrom}: Mo/Mi/Fr 13:00 - 17:00, Di/Do 08:00 - 13:00.
            </Text>
          </View>
          <div className="footerLinks">
            <Link className="textButton footerLink" href="/impressum">
              Impressum
            </Link>
            <Link className="textButton footerLink" href="/datenschutz">
              Datenschutz
            </Link>
            <Link className="textButton footerLink" href="/einwilligung">
              Einwilligung
            </Link>
            <a className="textButton footerLink" href={portalLoginHref}>
              Portal in Vorbereitung
            </a>
            <Link className="textButton footerLink" href="/kontakt">
              Kontakt
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="appShell">
      <a className="skipLink" href="#main-content">Zum Hauptinhalt</a>
      <RouteViewTracker />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <SiteFooter />
    </div>
  );
}

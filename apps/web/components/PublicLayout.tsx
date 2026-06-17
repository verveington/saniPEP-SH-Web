import Link from "next/link";
import { Calendar, Upload, User } from "lucide-react";
import type { ReactNode } from "react";
import { Text, View } from "reshaped";
import { contact } from "@frontend/app/publicContent";
import type { PublicRoute } from "../lib/routes/publicRoutes";
import { portalLoginHref } from "../lib/routes/publicRoutes";
import { ButtonText } from "./common";
import { RouteViewTracker } from "./RouteViewTracker";

function SiteHeader() {
  const navItems: Array<{ label: string; route: PublicRoute }> = [
    { label: "Start", route: "/" },
    { label: "Hilfe finden", route: "/hilfe-finden" },
    { label: "Lymphödem & Lipödem", route: "/lymphoedem-lipoedem-narbenkompression" },
    { label: "Brustprothetik", route: "/brustprothetik" },
    { label: "Pflegehilfsmittel", route: "/inkontinenz-pflegehilfsmittel" },
  ];

  return (
    <header className="siteHeader">
      <div className="headerInner">
        <Link className="brandLink" href="/">
          <span className="brandMark">
            <strong>
              sani<span>PEP</span>
            </strong>
            <small>Sanitätshaus München</small>
          </span>
        </Link>
        <nav className="navLinks" aria-label="Hauptnavigation">
          {navItems.map((item) => (
            <Link className="navLink" key={item.route} href={item.route}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="headerActions">
          <Link className="actionLink" href="/rezept-upload">
            <ButtonText icon={Upload}>Rezept</ButtonText>
          </Link>
          <Link className="actionLink actionLinkPrimary" href="/termin-anfragen">
            <ButtonText icon={Calendar}>Termin</ButtonText>
          </Link>
          <a className="portalLoginAnchor" href={portalLoginHref}>
            <ButtonText icon={User}>Portal Login</ButtonText>
          </a>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="footer">
      <div className="sectionInner">
        <View direction="row" justify="space-between" gap={5} wrap>
          <View direction="column" gap={1}>
            <Text weight="semibold">saniPEP Sanitätshaus</Text>
            <Text variant="body-2" color="neutral-faded">
              {contact.address} · {contact.phone} · {contact.email}
            </Text>
          </View>
          <View direction="row" gap={2} wrap>
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
              Kundenportal Login
            </a>
            <Link className="textButton footerLink" href="/kontakt">
              Kontakt
            </Link>
          </View>
        </View>
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

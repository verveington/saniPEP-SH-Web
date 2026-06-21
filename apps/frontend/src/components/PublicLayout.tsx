import { Calendar, Upload, User } from "lucide-react";
import type { ReactNode } from "react";
import { Text, View } from "reshaped";
import { contact } from "../app/publicContent";
import type { Navigate, PublicRoute } from "../app/routes";
import { ButtonText } from "./common";
import { RouteLink } from "./RouteLink";

function SiteHeader({
  route,
  navigate,
  portalLoginHref,
}: {
  route: PublicRoute;
  navigate: Navigate;
  portalLoginHref: string;
}) {
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
        <RouteLink className="brandLink" route="/" navigate={navigate}>
          <span className="brandMark">
            <strong>
              sani<span>PEP</span>
            </strong>
            <small>Sanitätshaus München</small>
          </span>
        </RouteLink>
        <nav className="navLinks" aria-label="Hauptnavigation">
          {navItems.map((item) => (
            <RouteLink
              className="navLink"
              key={item.route}
              route={item.route}
              navigate={navigate}
              ariaCurrent={route === item.route ? "page" : undefined}
            >
              {item.label}
            </RouteLink>
          ))}
        </nav>
        <div className="headerActions">
          <RouteLink className="actionLink" route="/rezept-upload" navigate={navigate}>
            <ButtonText icon={Upload}>Rezept vorab</ButtonText>
          </RouteLink>
          <RouteLink className="actionLink actionLinkPrimary" route="/termin-anfragen" navigate={navigate}>
            <ButtonText icon={Calendar}>Termin</ButtonText>
          </RouteLink>
          <a className="portalLoginAnchor" href={portalLoginHref}>
            <ButtonText icon={User}>Portal in Vorbereitung</ButtonText>
          </a>
        </div>
      </div>
    </header>
  );
}

function SiteFooter({ navigate, portalLoginHref }: { navigate: Navigate; portalLoginHref: string }) {
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
            <RouteLink className="textButton footerLink" route="/impressum" navigate={navigate}>
              Impressum
            </RouteLink>
            <RouteLink className="textButton footerLink" route="/datenschutz" navigate={navigate}>
              Datenschutz
            </RouteLink>
            <RouteLink className="textButton footerLink" route="/einwilligung" navigate={navigate}>
              Einwilligung
            </RouteLink>
            <a className="textButton footerLink" href={portalLoginHref}>
              Portal in Vorbereitung
            </a>
            <RouteLink className="textButton footerLink" route="/kontakt" navigate={navigate}>
              Kontakt
            </RouteLink>
          </View>
        </View>
      </div>
    </footer>
  );
}

export function PublicLayout({
  route,
  navigate,
  portalLoginHref,
  children,
}: {
  route: PublicRoute;
  navigate: Navigate;
  portalLoginHref: string;
  children: ReactNode;
}) {
  return (
    <div className="appShell">
      <a className="skipLink" href="#main-content">Zum Hauptinhalt</a>
      <SiteHeader route={route} navigate={navigate} portalLoginHref={portalLoginHref} />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <SiteFooter navigate={navigate} portalLoginHref={portalLoginHref} />
    </div>
  );
}

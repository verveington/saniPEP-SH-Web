"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Menu, Upload, User, X } from "lucide-react";
import { useId, useState } from "react";
import type { PublicRoute } from "../lib/routes/publicRoutes";
import { portalLoginHref } from "../lib/routes/publicRoutes";
import { ButtonText } from "./common";

const primaryNavItems: Array<{ label: string; route: PublicRoute }> = [
  { label: "Start", route: "/" },
  { label: "Hilfe finden", route: "/hilfe-finden" },
  { label: "Kompression", route: "/lymphoedem-lipoedem-narbenkompression" },
  { label: "Brustprothetik", route: "/brustprothetik" },
];

const drawerNavItems: Array<{ label: string; route: PublicRoute }> = [
  ...primaryNavItems,
  { label: "Pflegehilfsmittel", route: "/inkontinenz-pflegehilfsmittel" },
  { label: "Bandagen, Orthesen & Reha", route: "/bandagen-orthesen-reha-stoma" },
  { label: "Kontakt", route: "/kontakt" },
];

const activeRouteFor = (pathname: string | null, route: PublicRoute) => {
  if (!pathname) return false;
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
};

export function SiteHeader() {
  const pathname = usePathname();
  const drawerId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const closeDrawer = () => setIsOpen(false);

  return (
    <header className="siteHeader">
      <div className="headerInner">
        <Link className="brandLink brandLinkLogo" href="/" aria-label="saniPEP Sanitätshaus Startseite" onClick={closeDrawer}>
          <img
            className="brandLogo"
            src="/brand/sanipep-sanitaetshaus-logo.svg"
            width={205}
            height={70}
            alt="saniPEP Sanitätshaus"
          />
        </Link>

        <nav className="navLinks desktopNav" aria-label="Hauptnavigation">
          {primaryNavItems.map((item) => (
            <Link
              aria-current={activeRouteFor(pathname, item.route) ? "page" : undefined}
              className="navLink"
              key={item.route}
              href={item.route}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="headerActions">
          <Link className="actionLink headerSecondaryAction" href="/rezept-upload">
            <ButtonText icon={Upload}>Rezept vorab</ButtonText>
          </Link>
          <Link className="actionLink actionLinkPrimary" href="/termin-anfragen">
            <ButtonText icon={Calendar}>Termin</ButtonText>
          </Link>
          <button
            aria-controls={drawerId}
            aria-expanded={isOpen}
            className="menuButton"
            onClick={() => setIsOpen((value) => !value)}
            type="button"
          >
            <span className="buttonLabel">
              {isOpen ? <X aria-hidden /> : <Menu aria-hidden />}
              Menü
            </span>
          </button>
        </div>
      </div>

      <div className="mobileNavDrawer" data-open={isOpen ? "true" : "false"} id={drawerId}>
        <nav aria-label="Mobile Navigation" className="drawerNavLinks">
          {drawerNavItems.map((item) => (
            <Link
              aria-current={activeRouteFor(pathname, item.route) ? "page" : undefined}
              className="drawerNavLink"
              href={item.route}
              key={item.route}
              onClick={closeDrawer}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="drawerActions">
          <Link className="actionLink" href="/rezept-upload" onClick={closeDrawer}>
            <ButtonText icon={Upload}>Rezept vorab einreichen</ButtonText>
          </Link>
          <a className="portalLoginAnchor" href={portalLoginHref} onClick={closeDrawer}>
            <ButtonText icon={User}>Kundenportal Login</ButtonText>
          </a>
        </div>
      </div>
    </header>
  );
}

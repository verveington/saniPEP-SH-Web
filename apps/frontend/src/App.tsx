import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Text } from "reshaped";
import { createConversionEvent } from "./lib/conversionFunnel";
import { applyRouteMetadata } from "./lib/seo";
import type { ConversionEvent } from "./lib/types";
import { PublicLayout } from "./components/PublicLayout";
import {
  isServicePageRoute,
  normalizePublicRoute,
  portalLoginHref,
  type Navigate,
  type PublicRoute,
  type TrackConversion,
} from "./app/routes";
import LandingPage from "./pages/LandingPage";

const HelpFinderPage = lazy(() => import("./pages/HelpFinderPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const ConfiguratorPage = lazy(() => import("./pages/ConfiguratorPage"));
const PrescriptionUploadPage = lazy(() => import("./pages/PrescriptionUploadPage"));
const AppointmentRequestPage = lazy(() => import("./pages/AppointmentRequestPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

function RouteFallback() {
  return (
    <section className="section">
      <div className="sectionInner">
        <div className="safeRow" role="status" aria-live="polite">
          <Text variant="body-2" color="neutral-faded">
            Seite wird geladen.
          </Text>
        </div>
      </div>
    </section>
  );
}

function App() {
  const [route, setRoute] = useState<PublicRoute>(normalizePublicRoute);
  const [, setConversionEvents] = useState<ConversionEvent[]>([]);

  const trackConversion: TrackConversion = useCallback((input) => {
    setConversionEvents((current) => [
      ...current,
      createConversionEvent(input, current.length + 1),
    ]);
  }, []);

  useEffect(() => {
    const handlePopState = () => setRoute(normalizePublicRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    applyRouteMetadata(route);
    trackConversion({ stage: "route-view", route });
  }, [route, trackConversion]);

  const navigate: Navigate = useCallback((nextRoute) => {
    window.history.pushState(null, "", nextRoute);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <PublicLayout route={route} navigate={navigate} portalLoginHref={portalLoginHref}>
      <Suspense fallback={<RouteFallback />}>
        {route === "/" && <LandingPage navigate={navigate} portalLoginHref={portalLoginHref} />}
        {route === "/hilfe-finden" && <HelpFinderPage navigate={navigate} portalLoginHref={portalLoginHref} />}
        {isServicePageRoute(route) && <ServicePage route={route} navigate={navigate} />}
        {route === "/inkontinenz-pflegehilfsmittel" && <ConfiguratorPage onConversion={trackConversion} />}
        {route === "/rezept-upload" && <PrescriptionUploadPage onConversion={trackConversion} />}
        {route === "/termin-anfragen" && <AppointmentRequestPage onConversion={trackConversion} />}
        {route === "/kontakt" && <ContactPage navigate={navigate} onConversion={trackConversion} />}
        {route === "/impressum" && <LegalPage kind="imprint" title="Impressum" />}
        {route === "/datenschutz" && <LegalPage kind="privacy" title="Datenschutz" />}
        {route === "/einwilligung" && <LegalPage kind="consent" title="Einwilligung" />}
      </Suspense>
    </PublicLayout>
  );
}

export default App;

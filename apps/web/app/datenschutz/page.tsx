import { LegalPage } from "../../components/LegalPage";
import { StructuredData } from "../../components/StructuredData";
import { buildRouteMetadata } from "../../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/datenschutz");

export default function Page() {
  return (
    <>
      <StructuredData route="/datenschutz" />
      <LegalPage kind="privacy" title="Datenschutz" />
    </>
  );
}

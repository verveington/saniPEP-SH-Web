import { LegalPage } from "../../components/LegalPage";
import { StructuredData } from "../../components/StructuredData";
import { buildRouteMetadata } from "../../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/einwilligung");

export default function Page() {
  return (
    <>
      <StructuredData route="/einwilligung" />
      <LegalPage kind="consent" title="Einwilligung" />
    </>
  );
}

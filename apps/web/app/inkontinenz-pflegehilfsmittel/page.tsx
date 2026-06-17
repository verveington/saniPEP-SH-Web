import { CareConfiguratorForm } from "../../components/forms/CareConfiguratorForm";
import { StructuredData } from "../../components/StructuredData";
import { buildRouteMetadata } from "../../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/inkontinenz-pflegehilfsmittel");

export default function Page() {
  return (
    <>
      <StructuredData route="/inkontinenz-pflegehilfsmittel" />
      <CareConfiguratorForm />
    </>
  );
}

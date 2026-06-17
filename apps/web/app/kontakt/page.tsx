import { ContactPage } from "../../components/ContactPage";
import { StructuredData } from "../../components/StructuredData";
import { buildRouteMetadata } from "../../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/kontakt");

export default function Page() {
  return (
    <>
      <StructuredData route="/kontakt" />
      <ContactPage />
    </>
  );
}

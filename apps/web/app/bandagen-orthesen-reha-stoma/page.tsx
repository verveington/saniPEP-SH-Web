import { ServicePage } from "../../components/ServicePage";
import { StructuredData } from "../../components/StructuredData";
import { buildRouteMetadata } from "../../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/bandagen-orthesen-reha-stoma");

export default function Page() {
  return (
    <>
      <StructuredData route="/bandagen-orthesen-reha-stoma" />
      <ServicePage route="/bandagen-orthesen-reha-stoma" />
    </>
  );
}

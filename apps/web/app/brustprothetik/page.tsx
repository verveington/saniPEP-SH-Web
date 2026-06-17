import { ServicePage } from "../../components/ServicePage";
import { StructuredData } from "../../components/StructuredData";
import { buildRouteMetadata } from "../../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/brustprothetik");

export default function Page() {
  return (
    <>
      <StructuredData route="/brustprothetik" />
      <ServicePage route="/brustprothetik" />
    </>
  );
}

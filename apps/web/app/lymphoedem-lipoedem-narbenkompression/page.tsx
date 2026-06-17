import { ServicePage } from "../../components/ServicePage";
import { StructuredData } from "../../components/StructuredData";
import { buildRouteMetadata } from "../../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/lymphoedem-lipoedem-narbenkompression");

export default function Page() {
  return (
    <>
      <StructuredData route="/lymphoedem-lipoedem-narbenkompression" />
      <ServicePage route="/lymphoedem-lipoedem-narbenkompression" />
    </>
  );
}

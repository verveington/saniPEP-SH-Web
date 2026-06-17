import { HelpFinderClient } from "../../components/HelpFinderClient";
import { StructuredData } from "../../components/StructuredData";
import { buildRouteMetadata } from "../../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/hilfe-finden");

export default function Page() {
  return (
    <>
      <StructuredData route="/hilfe-finden" />
      <HelpFinderClient />
    </>
  );
}

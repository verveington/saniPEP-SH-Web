import { LandingPage } from "../components/LandingPage";
import { StructuredData } from "../components/StructuredData";
import { buildRouteMetadata } from "../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/");

export default function Page() {
  return (
    <>
      <StructuredData route="/" />
      <LandingPage />
    </>
  );
}

import { PrescriptionUploadForm } from "../../components/forms/PrescriptionUploadForm";
import { StructuredData } from "../../components/StructuredData";
import { buildRouteMetadata } from "../../lib/seo/metadata";

export const revalidate = 3600;

export const generateMetadata = () => buildRouteMetadata("/rezept-upload");

export default function Page() {
  return (
    <>
      <StructuredData route="/rezept-upload" />
      <PrescriptionUploadForm />
    </>
  );
}

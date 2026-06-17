import { LocationContact } from "./LocationContact";
import { SecuritySidePanel } from "./SecuritySidePanel";
import { ContactInquiryForm } from "./forms/ContactInquiryForm";

export function ContactPage() {
  return (
    <>
      <LocationContact standalone />
      <section className="sectionTight" style={{ background: "var(--sani-page)" }}>
        <div className="sectionInner gridTwo">
          <ContactInquiryForm />
          <SecuritySidePanel />
        </div>
      </section>
    </>
  );
}

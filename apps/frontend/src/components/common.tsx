import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge, Text, View } from "reshaped";
import type { ValidationResult } from "../lib/types";

type FieldErrors = ValidationResult["fieldErrors"];

export const ButtonText = ({ icon: Icon, children }: { icon: LucideIcon; children: string }) => (
  <span className="buttonLabel">
    <Icon aria-hidden />
    {children}
  </span>
);

export const IconBox = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="iconBox" aria-hidden>
    <Icon />
  </span>
);

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;

  return (
    <p id={id} className="fieldError" role="alert" aria-live="polite">
      {error}
    </p>
  );
}

export const inputA11y = (field: string, errors: FieldErrors) => ({
  "aria-invalid": errors[field] ? true : undefined,
  "aria-describedby": errors[field] ? `${field}-error` : undefined,
});

export function FormStep({
  number,
  title,
  copy,
  children,
}: {
  number: number;
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <section className="formStep" aria-label={`${number}. ${title}`}>
      <div className="formStepHeader">
        <span className="stepNumber">{number}</span>
        <View direction="column" gap={1}>
          <Text as="h2" variant="featured-6" weight="semibold">
            {title}
          </Text>
          <Text variant="body-2" color="neutral-faded">
            {copy}
          </Text>
        </View>
      </div>
      <div className="formStepBody">{children}</div>
    </section>
  );
}

export function RequestReceipt({ id }: { id: string }) {
  return (
    <div className="safeRow" role="status" aria-live="polite">
      <View direction="row" justify="space-between" gap={3} wrap>
        <Text weight="semibold">Anfrage vorbereitet</Text>
        <Badge color="primary" variant="faded">
          {id}
        </Badge>
      </View>
      <Text variant="body-2" color="neutral-faded">
        Die finale Verarbeitung erfolgt erst nach serverseitiger Prüfung, Rollenprüfung und Mitarbeiterfreigabe.
      </Text>
    </div>
  );
}

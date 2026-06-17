import type { Schema, Struct } from '@strapi/strapi';

export interface SharedCta extends Struct.ComponentSchema {
  collectionName: 'components_shared_ctas';
  info: {
    description: 'Redaktioneller Call-to-Action mit sicherer Zielroute';
    displayName: 'CTA';
  };
  attributes: {
    intent: Schema.Attribute.Enumeration<
      [
        'appointment',
        'prescription-upload',
        'written-inquiry',
        'care-configuration',
        'portal-login',
      ]
    > &
      Schema.Attribute.Required;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    route: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
  };
}

export interface SharedFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_faq_items';
  info: {
    description: 'Oeffentliche Antwort ohne individuelle Gesundheitsdaten';
    displayName: 'FAQ Item';
  };
  attributes: {
    answer: Schema.Attribute.RichText & Schema.Attribute.Required;
    question: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    safeTopic: Schema.Attribute.Enumeration<
      [
        'termin',
        'rezeptupload',
        'kompression',
        'brustprothetik',
        'inkontinenz',
        'pflegehilfsmittel',
        'portal',
        'kontakt',
      ]
    > &
      Schema.Attribute.Required;
  };
}

export interface SharedFormField extends Struct.ComponentSchema {
  collectionName: 'components_shared_form_fields';
  info: {
    description: 'CMS-steuerbares Formularfeld fuer Request-Flows';
    displayName: 'Form Field';
  };
  attributes: {
    fieldType: Schema.Attribute.Enumeration<
      [
        'text',
        'email',
        'phone',
        'date',
        'select',
        'textarea',
        'checkbox',
        'file',
      ]
    > &
      Schema.Attribute.Required;
    helpText: Schema.Attribute.Text;
    key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    options: Schema.Attribute.JSON;
    required: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    sortOrder: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface SharedInternalLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_internal_links';
  info: {
    description: 'Interne, sprechende Zielroute fuer SEO- und Inhaltsmodule';
    displayName: 'Internal Link';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    purpose: Schema.Attribute.Enumeration<
      ['primary-navigation', 'context', 'conversion', 'legal', 'portal-help']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'context'>;
    route: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
  };
}

export interface SharedOpeningHour extends Struct.ComponentSchema {
  collectionName: 'components_shared_opening_hours';
  info: {
    description: 'Strukturierte Oeffnungs- oder Erreichbarkeitszeit';
    displayName: 'Opening Hour';
  };
  attributes: {
    closesAt: Schema.Attribute.Time & Schema.Attribute.Required;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 40;
      }>;
    opensAt: Schema.Attribute.Time & Schema.Attribute.Required;
    weekday: Schema.Attribute.Enumeration<
      [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]
    > &
      Schema.Attribute.Required;
  };
}

export interface SharedProcessStep extends Struct.ComponentSchema {
  collectionName: 'components_shared_process_steps';
  info: {
    description: 'Redaktioneller Prozessschritt fuer Service- und Formularseiten';
    displayName: 'Process Step';
  };
  attributes: {
    copy: Schema.Attribute.Text & Schema.Attribute.Required;
    sortOrder: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'SEO-Metadaten fuer oeffentliche und noindex-Seiten';
    displayName: 'SEO';
  };
  attributes: {
    canonicalPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    description: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 170;
      }>;
    lastReviewedAt: Schema.Attribute.Date;
    locality: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    ogDescription: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    ogTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 90;
      }>;
    robots: Schema.Attribute.Enumeration<['index,follow', 'noindex,nofollow']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'index,follow'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.cta': SharedCta;
      'shared.faq-item': SharedFaqItem;
      'shared.form-field': SharedFormField;
      'shared.internal-link': SharedInternalLink;
      'shared.opening-hour': SharedOpeningHour;
      'shared.process-step': SharedProcessStep;
      'shared.seo': SharedSeo;
    }
  }
}

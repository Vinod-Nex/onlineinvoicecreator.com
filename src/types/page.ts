export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface HowToStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
}

export interface DocumentItem {
  title: string;
  description: string;
  badge?: string;
}

export interface ExampleLineItem {
  description: string;
  quantity?: number;
  rate?: string;
  amount: string;
}

export interface DocumentExample {
  title: string;
  scenario: string;
  sender: {
    name: string;
    details: string;
  };
  recipient: {
    name: string;
    details: string;
  };
  items: ExampleLineItem[];
  subtotal?: string;
  tax?: string;
  discount?: string;
  total: string;
  notes?: string;
  disclaimer?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface RelatedTool {
  title: string;
  href: string;
  badge: string;
  description: string;
}

export interface ToolPageData {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  canonical?: string;
  badge: string;
  h1: string;
  h1Highlight?: string;
  intro: string; // One-sentence intro per prompt specification
  toolType: 'invoice' | 'receipt' | 'rent-receipt';
  trustBadges?: string[];
  breadcrumbs: BreadcrumbItem[];
  howTo: {
    badge?: string;
    title: string;
    subtitle?: string;
    steps: HowToStep[];
  };
  whatItMustContain: {
    badge?: string;
    title: string;
    subtitle?: string;
    disclaimer?: string;
    items: DocumentItem[];
  };
  example: DocumentExample;
  faq: {
    badge?: string;
    title: string;
    subtitle?: string;
    items: FaqItem[];
  };
  relatedTools: {
    badge?: string;
    title: string;
    subtitle?: string;
    items: RelatedTool[];
  };
}

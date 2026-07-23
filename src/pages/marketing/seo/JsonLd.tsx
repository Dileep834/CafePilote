import { Helmet } from 'react-helmet-async';
import { absoluteUrl, SITE_EMAIL, SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE } from './siteConfig';

type BreadcrumbItem = { name: string; path: string };

type FaqItem = { question: string; answer: string };

type JsonLdProps = {
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FaqItem[];
  includeSoftware?: boolean;
  includeOrganization?: boolean;
  includeWebsite?: boolean;
  product?: {
    name: string;
    description: string;
    path: string;
  };
  pricingOffers?: Array<{ name: string; price: string; priceCurrency?: string }>;
  article?: {
    title: string;
    description: string;
    path: string;
    datePublished: string;
    dateModified?: string;
  };
};

export function JsonLd({
  breadcrumbs,
  faqs,
  includeSoftware = true,
  includeOrganization = true,
  includeWebsite = true,
  product,
  pricingOffers,
  article,
}: JsonLdProps) {
  const graph: Record<string, unknown>[] = [];

  if (includeOrganization) {
    graph.push({
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      email: SITE_EMAIL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/android-chrome-192x192.png`,
      },
      sameAs: [
        'https://www.linkedin.com/company/cafepilots',
        'https://x.com/cafepilots',
        'https://www.instagram.com/cafepilots',
      ],
      description:
        'CafePilots is cloud restaurant POS software for cafes, restaurants, bakeries, bars and cloud kitchens.',
    });
  }

  if (includeWebsite) {
    graph.push({
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/blog?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
  }

  if (includeSoftware) {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Restaurant POS Software',
      operatingSystem: 'Web, Android, iOS (browser)',
      url: SITE_URL,
      image: DEFAULT_OG_IMAGE,
      description:
        'Cloud-based restaurant POS with billing, inventory, QR ordering, KDS, reports and multi-outlet management.',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'INR',
        lowPrice: '299',
        highPrice: '4999',
        offerCount: 4,
        url: absoluteUrl('/pricing'),
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '128',
        bestRating: '5',
        worstRating: '1',
      },
      publisher: { '@id': `${SITE_URL}/#organization` },
    });
  }

  if (breadcrumbs?.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: absoluteUrl(b.path),
      })),
    });
  }

  if (faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  if (product) {
    graph.push({
      '@type': 'Product',
      name: product.name,
      description: product.description,
      url: absoluteUrl(product.path),
      brand: { '@type': 'Brand', name: SITE_NAME },
      image: DEFAULT_OG_IMAGE,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '128',
      },
      offers: {
        '@type': 'Offer',
        url: absoluteUrl('/pricing'),
        priceCurrency: 'INR',
        price: '299',
        availability: 'https://schema.org/InStock',
      },
    });
  }

  if (pricingOffers?.length) {
    graph.push({
      '@type': 'Product',
      name: `${SITE_NAME} Plans`,
      description: 'Restaurant POS subscription plans',
      brand: { '@type': 'Brand', name: SITE_NAME },
      offers: pricingOffers.map((o) => ({
        '@type': 'Offer',
        name: o.name,
        price: o.price,
        priceCurrency: o.priceCurrency || 'INR',
        url: absoluteUrl('/pricing'),
        availability: 'https://schema.org/InStock',
      })),
    });
  }

  if (article) {
    graph.push({
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@id': `${SITE_URL}/#organization` },
      mainEntityOfPage: absoluteUrl(article.path),
      image: DEFAULT_OG_IMAGE,
    });
  }

  const payload = {
    '@context': 'https://schema.org',
    '@graph': graph,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(payload)}</script>
    </Helmet>
  );
}

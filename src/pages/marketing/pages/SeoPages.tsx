import { useParams, Link, Navigate } from 'react-router-dom';
import { LANDING_PAGES } from '../content/landings';
import { MarketingPageTemplate } from './MarketingPageTemplate';
import { BLOG_ARTICLES, getArticle } from '../content/blog';
import { SeoHead } from '../seo/SeoHead';
import { JsonLd } from '../seo/JsonLd';
import { Breadcrumbs } from '../seo/Breadcrumbs';
import { getPageMeta } from '../seo/siteConfig';

export function SeoLandingBySlug() {
  const { slug } = useParams();
  const key = String(slug || '');
  const content = LANDING_PAGES[key];
  if (!content) return <Navigate to="/features" replace />;
  return <MarketingPageTemplate content={content} />;
}

/** Fixed-path wrappers used by routes without :slug */
export function FeaturesPage() {
  return <MarketingPageTemplate content={LANDING_PAGES.features} />;
}
export function PricingPage() {
  const content = LANDING_PAGES.pricing;
  const meta = getPageMeta('/pricing');
  return (
    <>
      {meta ? (
        <JsonLd
          pricingOffers={[
            { name: 'Lite', price: '299' },
            { name: 'Standard', price: '999' },
            { name: 'Professional', price: '2499' },
            { name: 'Enterprise', price: '4999' },
          ]}
          faqs={content.faqs}
          breadcrumbs={[
            { name: 'Home', path: '/' },
            { name: 'Pricing', path: '/pricing' },
          ]}
        />
      ) : null}
      <MarketingPageTemplate content={content} />
    </>
  );
}
export function AboutPage() {
  return <MarketingPageTemplate content={LANDING_PAGES.about} />;
}
export function ContactPage() {
  return <MarketingPageTemplate content={LANDING_PAGES.contact} />;
}
export function SupportPage() {
  return <MarketingPageTemplate content={LANDING_PAGES.support} />;
}

export function BlogIndexPage() {
  const meta = getPageMeta('/blog');
  if (!meta) return null;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <SeoHead meta={meta} />
      <JsonLd
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ]}
      />
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Blog' }]} />
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Restaurant POS blog</h1>
        <p className="mt-3 text-lg text-slate-600">
          Guides on restaurant POS, QR ordering, inventory, GST billing, KDS and restaurant ERP.
        </p>
      </header>
      <ul className="space-y-4">
        {BLOG_ARTICLES.map((a) => (
          <li key={a.slug}>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                <Link to={`/blog/${a.slug}`} className="hover:text-brand-orange">
                  {a.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-slate-600">{a.description}</p>
              <p className="mt-3 text-xs text-slate-400">
                Updated {a.dateModified} · {a.tags.join(' · ')}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BlogArticlePage() {
  const { slug } = useParams();
  const article = getArticle(String(slug || ''));
  if (!article) return <Navigate to="/blog" replace />;

  const meta = {
    path: `/blog/${article.slug}`,
    title: `${article.title} | CafePilots`,
    description: article.description,
    keywords: article.keywords,
    type: 'article' as const,
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <SeoHead
        meta={meta}
        article={{
          publishedTime: article.datePublished,
          modifiedTime: article.dateModified,
          author: 'CafePilots',
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: article.title, path: `/blog/${article.slug}` },
        ]}
        faqs={article.faqs}
        article={{
          title: article.title,
          description: article.description,
          path: `/blog/${article.slug}`,
          datePublished: article.datePublished,
          dateModified: article.dateModified,
        }}
      />
      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: article.title },
        ]}
      />
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{article.title}</h1>
        <p className="mt-3 text-lg text-slate-600">{article.description}</p>
      </header>
      {article.sections.map((s) => (
        <section key={s.heading} className="mb-8">
          <h2 className="text-xl font-semibold">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p.slice(0, 40)} className="mt-3 text-[15px] leading-7 text-slate-700">
              {p}
            </p>
          ))}
        </section>
      ))}
      <section className="mb-10">
        <h2 className="text-xl font-semibold">FAQ</h2>
        {article.faqs.map((f) => (
          <details key={f.question} className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer font-medium">{f.question}</summary>
            <p className="mt-2 text-sm text-slate-600">{f.answer}</p>
          </details>
        ))}
      </section>
      <p className="text-sm text-slate-600">
        Related:{' '}
        <Link className="text-brand-orange underline" to="/restaurant-pos">
          Restaurant POS
        </Link>
        {' · '}
        <Link className="text-brand-orange underline" to="/pricing">
          Pricing
        </Link>
        {' · '}
        <Link className="text-brand-orange underline" to="/contact">
          Contact
        </Link>
      </p>
    </article>
  );
}

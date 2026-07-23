import { Link } from 'react-router-dom';
import { SeoHead } from '../seo/SeoHead';
import { JsonLd } from '../seo/JsonLd';
import { Breadcrumbs } from '../seo/Breadcrumbs';
import { getPageMeta, SITE_EMAIL } from '../seo/siteConfig';
import type { LandingContent } from '../content/landings';

export function MarketingPageTemplate({ content }: { content: LandingContent }) {
  const meta = getPageMeta(content.path);
  if (!meta) return null;

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: content.h1 },
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <SeoHead meta={meta} />
      <JsonLd
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: meta.title.split('|')[0].trim(), path: content.path },
        ]}
        faqs={content.faqs}
        product={{
          name: content.h1,
          description: content.intro,
          path: content.path,
        }}
      />

      <Breadcrumbs items={crumbs} />

      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{content.h1}</h1>
        <p className="mt-4 text-lg text-slate-600">{content.intro}</p>
      </header>

      {content.sections.map((section) => (
        <section key={section.heading} className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="mt-3 text-[15px] leading-7 text-slate-700">
              {p}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-[15px] text-slate-700">
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      {content.comparison ? (
        <section className="mb-10 overflow-x-auto">
          <h2 className="mb-3 text-xl font-semibold text-slate-900">{content.comparison.title}</h2>
          <table className="min-w-full border-collapse text-left text-sm">
            <caption className="sr-only">{content.comparison.title}</caption>
            <tbody>
              {content.comparison.rows.map((row, idx) => (
                <tr key={row.join('-')} className={idx === 0 ? 'bg-slate-100 font-semibold' : 'border-t border-slate-200'}>
                  {row.map((cell) => (
                    <td key={cell} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-slate-900">Frequently asked questions</h2>
        <div className="mt-4 space-y-4">
          {content.faqs.map((f) => (
            <details key={f.question} className="rounded-lg border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-medium text-slate-900">{f.question}</summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-slate-900">Related pages</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {content.related.map((r) => (
            <li key={r.to}>
              <Link
                to={r.to}
                className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:border-brand-orange hover:text-brand-orange"
              >
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-slate-900 px-6 py-8 text-white">
        <h2 className="text-2xl font-semibold">{content.cta.title}</h2>
        <p className="mt-2 text-slate-300">{content.cta.body}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/contact"
            className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
          >
            Contact / Demo
          </Link>
          <a
            href={`mailto:${SITE_EMAIL}`}
            className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            Email us
          </a>
        </div>
      </section>
    </article>
  );
}

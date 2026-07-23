import { Helmet } from 'react-helmet-async';
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  TWITTER_HANDLE,
  type MarketingPageMeta,
} from './siteConfig';

type SeoHeadProps = {
  meta: MarketingPageMeta;
  image?: string;
  noIndex?: boolean;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
  };
};

export function SeoHead({ meta, image, noIndex, article }: SeoHeadProps) {
  const url = absoluteUrl(meta.path);
  const ogImage = image || DEFAULT_OG_IMAGE;
  const robots = noIndex ? 'noindex, nofollow' : 'index, follow';
  const keywords = meta.keywords.join(', ');

  return (
    <Helmet>
      <html lang="en" />
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <link rel="canonical" href={url} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={article ? 'article' : meta.type || 'website'} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={ogImage} />

      {article?.publishedTime ? (
        <meta property="article:published_time" content={article.publishedTime} />
      ) : null}
      {article?.modifiedTime ? (
        <meta property="article:modified_time" content={article.modifiedTime} />
      ) : null}
      {article?.author ? <meta property="article:author" content={article.author} /> : null}
    </Helmet>
  );
}

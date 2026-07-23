import { Route } from 'react-router-dom';
import { MarketingLayout } from './seo/MarketingLayout';
import {
  AboutPage,
  BlogArticlePage,
  BlogIndexPage,
  ContactPage,
  FeaturesPage,
  PricingPage,
  SupportPage,
} from './pages/SeoPages';
import { MarketingPageTemplate } from './pages/MarketingPageTemplate';
import { LANDING_PAGES } from './content/landings';

function Landing(pathKey: keyof typeof LANDING_PAGES) {
  return <MarketingPageTemplate content={LANDING_PAGES[pathKey]} />;
}

/**
 * Public marketing SEO routes — register only on marketing host (not app.*).
 * Paths are lowercase hyphenated; ERP redirects must not steal these.
 */
export function MarketingSeoRoutes() {
  return (
    <Route element={<MarketingLayout />}>
      <Route path="features" element={<FeaturesPage />} />
      <Route path="pricing" element={<PricingPage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="contact" element={<ContactPage />} />
      <Route path="support" element={<SupportPage />} />
      <Route path="blog" element={<BlogIndexPage />} />
      <Route path="blog/:slug" element={<BlogArticlePage />} />
      <Route path="inventory" element={Landing('inventory')} />
      <Route path="billing" element={Landing('billing')} />
      <Route path="kds" element={Landing('kds')} />
      <Route path="qr-ordering" element={Landing('qr-ordering')} />
      <Route path="multi-outlet" element={Landing('multi-outlet')} />
      <Route path="reports" element={Landing('reports')} />
      <Route path="restaurant-pos" element={Landing('restaurant-pos')} />
      <Route path="cafe-pos" element={Landing('cafe-pos')} />
      <Route path="bakery-pos" element={Landing('bakery-pos')} />
      <Route path="cloud-kitchen-pos" element={Landing('cloud-kitchen-pos')} />
      <Route path="bar-pos" element={Landing('bar-pos')} />
      <Route path="retail-pos" element={Landing('retail-pos')} />
      <Route path="gst-billing" element={Landing('gst-billing')} />
      <Route path="restaurant-erp" element={Landing('restaurant-erp')} />
    </Route>
  );
}

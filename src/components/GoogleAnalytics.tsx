'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { GA_MEASUREMENT_ID } from '@/lib/gtag'

const GoogleAnalytics = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isInitialized, setIsInitialized] = useState(false)

  // Handle route changes
  useEffect(() => {
    if (isInitialized && pathname && window.gtag) {
      window.gtag('event', 'page_view', {
        page_location: window.location.href || null,
        page_path: pathname || null,
        send_to: GA_MEASUREMENT_ID || null
      });
    }
  }, [pathname, searchParams, isInitialized]);

  const handleInitialize = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: true,
        cookie_domain: 'auto',
        cookie_flags: 'SameSite=None;Secure',
      });
    }
    setIsInitialized(true);
  };

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        onLoad={handleInitialize}
        onError={(e) => console.error('GA: Script failed to load', e)}
      />
    </>
  )
}

// Wrap the GoogleAnalytics component in a Suspense boundary
const GoogleAnalyticsWrapper = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <GoogleAnalytics />
  </Suspense>
);

export default GoogleAnalyticsWrapper; 
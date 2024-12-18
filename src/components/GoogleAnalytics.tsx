'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GA_MEASUREMENT_ID } from '@/lib/gtag'

export default function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isInitialized, setIsInitialized] = useState(false)

  // Handle route changes
  useEffect(() => {
    if (isInitialized && pathname && window.gtag) {
    //   console.log('📊 GA: Tracking page view:', pathname);
      window.gtag('event', 'page_view', {
        page_location: window.location.href || null,
        page_path: pathname || null,
        send_to: GA_MEASUREMENT_ID || null
      });
    }
  }, [pathname, searchParams, isInitialized]);

  const handleInitialize = () => {
    // console.log('📊 GA: Initializing...');
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
      // console.log('📊 GA: Event tracked:', ...arguments); // Comment out for production
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
    // console.log('📊 GA: Initialization complete');
  };

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        onLoad={() => {
        //   console.log('📊 GA: Base script loaded');
          handleInitialize();
        }}
        onError={(e) => console.error('📊 GA: Script failed to load', e)}
      />
    </>
  )
} 
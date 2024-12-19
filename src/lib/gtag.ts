export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

declare global {
  interface Window {
    gtag: (type: string, ...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// Log page views
export const pageview = (url: string) => {
  window.gtag('event', 'page_view', {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
    send_to: GA_MEASUREMENT_ID
  });
};

// Track events
export const trackEvent = {
  smsClick: () => {
    window.gtag('event', 'sms_click', {
      event_category: 'engagement',
      event_label: 'SMS Button Click',
      send_to: GA_MEASUREMENT_ID
    });
  },

  scrollDepth: (depth: string) => {
    window.gtag('event', 'scroll_depth', {
      event_category: 'engagement',
      event_label: depth,
      send_to: GA_MEASUREMENT_ID
    });
  },

  externalLinkClick: (url: string) => {
    window.gtag('event', 'click', {
      event_category: 'outbound',
      event_label: url,
      send_to: GA_MEASUREMENT_ID
    });
  }
};
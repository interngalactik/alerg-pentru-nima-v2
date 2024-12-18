// Add your GA4 measurement ID here
export const GA_MEASUREMENT_ID = 'G-DZX11ZKFKJ'

// Initialize GA
export const initGA = () => {
  if (typeof window !== 'undefined' && !window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
  }
};

// Log page views
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
      page_location: window.location.href,
      page_title: document.title
    });
  }
};

// Common events we want to track
export const trackEvent = {
  // Track SMS button clicks
  smsClick: () => {
    console.log('Tracking SMS click'); // Debug log
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'sms_click', {
        event_category: 'engagement',
        event_label: 'SMS Button Click',
        send_to: GA_MEASUREMENT_ID
      });
    }
  },

  // Track scroll depth
  scrollDepth: (depth: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'scroll_depth', {
        event_category: 'engagement',
        event_label: depth,
        send_to: GA_MEASUREMENT_ID
      });
    }
  },

  // Track external link clicks
  externalLinkClick: (url: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'external_link_click', {
        event_category: 'engagement',
        event_label: url,
        send_to: GA_MEASUREMENT_ID
      });
    }
  }
} 
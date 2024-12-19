// Add your GA4 measurement ID here
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
console.log('GA_MEASUREMENT_ID:', GA_MEASUREMENT_ID);

declare global {
  interface Window {
    gtag: (
      type: string,
      ...args: unknown[]
    ) => void;
  }
}

export const pageview = (url: string) => {
//   console.log('📊 GA Lib: Tracking pageview:', url);
  window.gtag('event', 'page_view', {
    page_location: window.location.href,
    page_path: url,
    send_to: GA_MEASUREMENT_ID
  });
};

// Export trackEvent for existing components
export const trackEvent = {
  smsClick: () => {
    // console.log('📊 GA Lib: Tracking SMS click');
    window.gtag('event', 'sms_click', {
      event_category: 'engagement',
      event_label: 'SMS Button Click',
      send_to: GA_MEASUREMENT_ID
    });
  },

  scrollDepth: (depth: string) => {
    // console.log('📊 GA Lib: Tracking scroll depth:', depth);
    window.gtag('event', 'scroll_depth', {
      event_category: 'engagement',
      event_label: depth,
      send_to: GA_MEASUREMENT_ID
    });
  },

  externalLinkClick: (url: string) => {
    // console.log('📊 GA Lib: Tracking external link:', url);
    window.gtag('event', 'click', {
      event_category: 'outbound',
      event_label: url,
      send_to: GA_MEASUREMENT_ID
    });
  }
};

// Generic event function
export const event = ({ action, params }: { action: string; params: unknown }) => {
//   console.log('📊 GA Lib: Tracking custom event:', action, params);
  window.gtag('event', action, params);
};

export const gtag = (type: string, eventName: string, options?: { [key: string]: unknown }) => {
  // Example implementation using the parameters
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName, // Use eventName to specify the event
    event_type: type,  // Use type to specify the type of event
    ...options,        // Spread any additional options
  });
};
// Add your GA4 measurement ID here
export const GA_MEASUREMENT_ID = 'G-DZX11ZKFKJ'

// Log page views
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
      send_page_view: true
    })
  }
}

// Common events we want to track
export const trackEvent = {
  // Track SMS button clicks
  smsClick: () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'sms_click', {
        event_category: 'engagement',
        event_label: 'SMS Button Click',
        send_to: GA_MEASUREMENT_ID
      })
    }
  },

  // Track scroll depth
  scrollDepth: (depth: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'scroll_depth', {
        event_category: 'engagement',
        event_label: depth,
        send_to: GA_MEASUREMENT_ID
      })
    }
  },

  // Track external link clicks
  externalLinkClick: (url: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'external_link_click', {
        event_category: 'engagement',
        event_label: url,
        send_to: GA_MEASUREMENT_ID
      })
    }
  }
} 
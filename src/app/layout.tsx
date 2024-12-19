'use client'

import './globals.css'
import ScrollToTop from '@/components/ScrollToTop'
import GoogleAnalyticsWrapper from '@/components/GoogleAnalytics'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <head>
        <link rel="icon" href="/images/favicon.png" sizes="any" />
      </head>
      <body>
        <GoogleAnalyticsWrapper />
        {children}
        <ScrollToTop />
      </body>
    </html>
  )
}
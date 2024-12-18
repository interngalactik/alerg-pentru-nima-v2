'use client'

import './globals.css'
import ScrollToTop from '@/components/ScrollToTop'
import GoogleAnalytics from '@/components/GoogleAnalytics'

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
        <GoogleAnalytics />
        {children}
        <ScrollToTop />
      </body>
    </html>
  )
}
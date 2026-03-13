'use client'

import React from 'react'
import './globals.css'
import Script from 'next/script'
import ScrollToTop from '@/components/ScrollToTop'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

// Create a theme instance
const theme = createTheme({
  palette: {
    mode: 'light',
  },
})

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params?: Promise<Record<string, string | string[]>>
}) {
  // Next.js 15: unwrap params so it isn't enumerated (e.g. by dev overlay) before use
  if (params != null) {
    React.use(params)
  }

  return (
    <html lang="ro">
      <head>
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              send_page_view: true,
              debug_mode: true
            });
          `}
        </Script>
      </head>
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
          <ScrollToTop />
        </ThemeProvider>
      </body>
    </html>
  )
}
'use client'

import './globals.css'
import ScrollToTop from '@/components/ScrollToTop'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { pageview, trackEvent } from '../lib/gtag'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      pageview(pathname)
    }

    // Track scroll depth
    const handleScroll = () => {
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)
      if (scrolled >= 0.25) trackEvent.scrollDepth('25%')
      if (scrolled >= 0.50) trackEvent.scrollDepth('50%')
      if (scrolled >= 0.75) trackEvent.scrollDepth('75%')
      if (scrolled >= 0.90) trackEvent.scrollDepth('90%')
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  return (
    <html lang="ro">
      <body>
        {children}
        <ScrollToTop />
      </body>
    </html>
  )
}
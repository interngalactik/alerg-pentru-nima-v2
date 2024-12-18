import { Html, Head, Main, NextScript } from 'next/document'
import { GA_MEASUREMENT_ID } from '../lib/gtag'

export default function Document() {
  return (
    <Html lang="ro">
      <Head>
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_location: window.location.href,
                page_path: window.location.pathname,
                page_title: document.title
              });
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 
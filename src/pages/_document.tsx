import { Html, Head, Main, NextScript } from 'next/document'
import { GA_MEASUREMENT_ID } from '../lib/gtag'

export default function Document() {
  return (
    <Html lang="ro">
      <Head>
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          onError={() => console.error('Failed to load GA script')}
          onLoad={() => console.log('GA script loaded successfully')}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
                console.log('GA script initialized');
              } catch (error) {
                console.error('GA initialization error:', error);
              }
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
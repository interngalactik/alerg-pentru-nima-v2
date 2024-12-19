   // src/components/GoogleAnalytics.tsx
   import { useEffect } from 'react';
   import { useRouter } from 'next/router'; // Assuming you're using Next.js
   import Script from 'next/script';

   const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

   const GoogleAnalytics = () => {
     const router = useRouter();

     useEffect(() => {
       // Initialize Google Analytics
       window.dataLayer = window.dataLayer || [];
       window.gtag = function(...args: unknown[]) {
         window.dataLayer.push(args);
       };
       window.gtag('js', new Date());
       window.gtag('config', GA_MEASUREMENT_ID, {
         send_page_view: true, // Automatically send a page view event
       });

       // Track page views on route change
       const handleRouteChange = (url: string) => {
         window.gtag('config', GA_MEASUREMENT_ID, {
           page_path: url,
         });
       };

       router.events.on('routeChangeComplete', handleRouteChange);

       // Cleanup the event listener on unmount
       return () => {
         router.events.off('routeChangeComplete', handleRouteChange);
       };
     }, [router.events]);

     return (
       <>
         <Script
           async
           src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
         />
       </>
     );
   };

   export default GoogleAnalytics;
// src/global.d.ts
declare global {
    interface Window {
      gtag: (
        type: string,
        eventName: string,
        options?: { [key: string]: unknown }
      ) => void;
    }
  }
  
  export {};
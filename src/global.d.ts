// src/global.d.ts
declare global {
    interface Window {
      gtag: (...args: unknown[]) => void; // Changed from any[] to unknown[]
    }
  }
  
  export {};
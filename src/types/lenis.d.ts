declare module '@studio-freight/lenis' {
  export default class Lenis {
    constructor(options: {
      duration?: number
      easing?: (t: number) => number
      direction?: 'vertical' | 'horizontal'
      gestureDirection?: 'vertical' | 'horizontal'
      smooth?: boolean
      smoothTouch?: boolean
      touchMultiplier?: number
      infinite?: boolean
      wrapper?: Window | HTMLElement
      content?: HTMLElement
    })
    raf: (time: number) => void
    destroy: () => void
    resize: () => void
  }
} 
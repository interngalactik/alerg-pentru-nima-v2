'use client'

import { useEffect } from 'react'
import { trackEvent } from '../lib/gtag'

export default function Footer() {
  useEffect(() => {
    const yearEl = document.querySelector("#copyright-year")
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear().toString()
    }
  }, [])

  return (
    <section className="section">
      <div className="container centered">
        <div className="_60_spacer"></div>
        <div className="footer_links">
          <a href="https://instagram.com/nistrun" onClick={() => trackEvent.externalLinkClick('https://instagram.com/nistrun')} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginBottom: '10px', marginRight: '10px' }}>
            <img src="/images/instagram-logo.svg" alt="Instagram" className="instagram-icon" style={{ width: '24px', height: '24px' }} />
          </a>
          <a href="https://www.strava.com/athletes/14970588" onClick={() => trackEvent.externalLinkClick('https://www.strava.com/athletes/14970588')} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginBottom: '10px' }}>
            <img src="/images/strava-logo.svg" alt="Strava" className="strava-icon" style={{ width: '24px', height: '24px' }} />
          </a>
            <br></br>
          <p className="paragraph smaller">
            with ❤️ for <a href="https://sanctuarnima.ro/" onClick={() => trackEvent.externalLinkClick('https://sanctuarnima.ro/')} target="_blank" rel="noopener noreferrer" className="footer_bold">Sanctuarul Nima</a>
            <br/>
            powered by <a href="https://naturaumanafilm.ro/" onClick={() => trackEvent.externalLinkClick('https://naturaumanafilm.ro/')} target="_blank" rel="noopener noreferrer" className="footer_bold">Natura Umană Film</a>
            <br/>
            developed by <a href="mailto:eduard@nistru.ro" onClick={() => trackEvent.externalLinkClick('mailto:eduard@nistru.ro')} className="footer_bold">Eduard Nistru</a>
            <br/>
            designed &amp; coded by <a href="https://maxanchidin.design/" onClick={() => trackEvent.externalLinkClick('https://maxanchidin.design/')} target="_blank" rel="noopener noreferrer" className="footer_bold">Max Anchidin</a>
            <br/>
          </p>
        </div>
        <div className="_30-spacer"></div>
        <p className="paragraph smaller">© <span id="copyright-year">2024</span> Alerg Pentru Nima</p>
        <div className="_60_spacer"></div>
      </div>
    </section>
  )
}
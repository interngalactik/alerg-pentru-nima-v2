'use client'

import { useEffect } from 'react'

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
          <p className="paragraph smaller">
            with ❤️ for <a href="https://sanctuarnima.ro/" target="_blank" rel="noopener noreferrer" className="footer_bold">Sanctuarul Nima</a>
            <br/>
            powered by <a href="https://naturaumanafilm.ro/" target="_blank" rel="noopener noreferrer" className="footer_bold">Natura Umană Film</a>
            <br/>
            developed by <a href="mailto:eduard@nistru.ro" className="footer_bold">Eduard Nistru</a>
            <br/>
            designed &amp; coded by <a href="https://maxanchidin.design/" target="_blank" rel="noopener noreferrer" className="footer_bold">Max Anchidin</a>
          </p>
        </div>
        <div className="_30-spacer"></div>
        <p className="paragraph smaller">© <span id="copyright-year">2024</span> Alerg Pentru Nima</p>
        <div className="_60_spacer"></div>
      </div>
    </section>
  )
}
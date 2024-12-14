'use client'

import Image from 'next/image'

export default function Sponsors() {
  return (
    <section className="section">
      <div className="container centered">
        <div className="_60_spacer"></div>
        <h2 className="heading">Sponsori</h2>
        <div className="_15-spacer"></div>
        <div className="sponsors_text-wrapper">
          <p className="paragraph">
            Deții sau cunoști o firmă care vrea să suțină animăluțele 
            <span className="paragraph_emphasis">Sanctuarului Nima</span>? 
            Scrie-mi aici:
          </p>
        </div>
        <div className="_30-spacer"></div>
        <a href="mailto:eduard@nistru.ro" className="email">
          eduard@nistru.ro
        </a>
        <div className="_15-spacer"></div>
        <Image 
          src="/images/tshirt_logo_1.webp"
          alt="T-shirt logo"
          width={691}
          height={400}
          className="tshirt-logo_image"
        />
        <div className="logos_wrapper">
          {/* Placeholder logos */}
          <Image 
            src="/images/logo_placeholder.svg"
            alt="Logo placeholder"
            width={200}
            height={100}
            className="logo_placeholder"
          />
          {/* Repeat for other placeholders */}
        </div>
        <div className="_100-spacer"></div>
      </div>
    </section>
  )
}
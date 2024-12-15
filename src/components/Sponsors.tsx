'use client'

import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export default function Sponsors() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { 
    once: true, 
    margin: "-20% 0px -20% 0px",
    amount: 0.6
  })

  return (
    <section className="section" ref={sectionRef}>
      <div className="container centered" style={{ 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div className="_60_spacer"></div>
        <h2 className="heading">Sponsori</h2>
        <div className="_15-spacer"></div>
        <div className="sponsors_text-wrapper">
          <p className="paragraph">
            Deții sau cunoști o firmă care vrea să suțină animăluțele <span className="paragraph_emphasis">Sanctuarului Nima</span>? Scrie-mi aici:
          </p>
        </div>
        <div className="_30-spacer"></div>
        <a href="mailto:eduard@nistru.ro" className="email">eduard@nistru.ro</a>
        <div className="_15-spacer"></div>
        
        <Image 
          src="/images/tshirt_logo_1.webp"
          loading="eager"
          width={691}
          height={400}
          alt=""
          sizes="(max-width: 479px) 93vw, (max-width: 767px) 346.15625px, 45vw"
          className="tshirt-logo_image"
          srcSet={`
            /images/tshirt_logo_1tshirt_logo.webp 500w,
            /images/tshirt_logo_1tshirt_logo.webp 800w,
            /images/tshirt_logo_1tshirt_logo.webp 1080w,
            /images/tshirt_logo_1.webp 1382w
          `}
        />

        <div className="logos_wrapper" style={{ 
          display: 'flex', 
          gap: '2rem', 
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <motion.img 
            src="/images/logo_placeholder.svg"
            loading="eager"
            alt=""
            className="logo_placeholder"
            data-w-id="2cc85b93-edbe-21d5-ad74-b413dbfe3b5d"
            style={{ 
              width: '200px', 
              height: 'auto',
              opacity: isInView ? 1 : 0,
              transform: isInView ? 'scale(1)' : 'scale(0.6)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
            }}
          />
          <motion.img 
            src="/images/logo_placeholder.svg"
            loading="eager"
            alt=""
            className="logo_placeholder"
            data-w-id="3d920218-c1ea-9bf2-d0ce-00ca2f9e56b7"
            style={{ 
              width: '200px', 
              height: 'auto',
              opacity: isInView ? 1 : 0,
              transform: isInView ? 'scale(1)' : 'scale(0.6)',
              transition: 'opacity 0.6s ease-out 0.2s, transform 0.6s ease-out 0.2s'
            }}
          />
          <motion.img 
            src="/images/logo_placeholder.svg"
            loading="eager"
            alt=""
            className="logo_placeholder"
            data-w-id="a9fa1672-0322-102e-7b73-57794a316044"
            style={{ 
              width: '200px', 
              height: 'auto',
              opacity: isInView ? 1 : 0,
              transform: isInView ? 'scale(1)' : 'scale(0.6)',
              transition: 'opacity 0.6s ease-out 0.4s, transform 0.6s ease-out 0.4s'
            }}
          />
        </div>
        <div className="_100-spacer"></div>
      </div>
    </section>
  )
}
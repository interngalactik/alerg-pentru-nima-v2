'use client'

import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export default function About() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <>
      <section id="despre" className="section blue-transparent" ref={sectionRef}>
        <div className="container centered">
          <div className="_100-spacer"></div>
          <div className="despre-campanie_wrapper">
            <div id="w-node-d588b50e-8d7b-df55-aa73-67d670682d63-2990c7dd" className="despre-campanie_images-wrapper">
              <motion.img 
                className="despre-campanie_image"
                src="/images/nima_layer1_1.webp"
                width={733}
                alt=""
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.6 }}
                loading="eager"
                sizes="(max-width: 479px) 97vw, (max-width: 767px) 468.265625px, (max-width: 991px) 60vw, 44vw"
                srcSet="/images/nima_layer1_1nima_layer1.webp 500w, /images/nima_layer1_1nima_layer1.webp 800w, /images/nima_layer1_1nima_layer1.webp 1080w, /images/nima_layer1_1.webp 1466w"
              />
              <motion.img 
                className="despre-campanie_image _2"
                src="/images/nima_layer2_1.webp"
                width={733}
                alt=""
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                loading="eager"
                sizes="(max-width: 479px) 97vw, (max-width: 767px) 468.265625px, (max-width: 991px) 60vw, 44vw"
                srcSet="/images/nima_layer2_1nima_layer2.webp 500w, /images/nima_layer2_1nima_layer2.webp 800w, /images/nima_layer2_1nima_layer2.webp 1080w, /images/nima_layer2_1.webp 1466w"
              />
              <motion.img 
                className="despre-campanie_image _2"
                src="/images/nima_layer3_1.webp"
                width={733}
                alt=""
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                loading="eager"
                sizes="(max-width: 479px) 97vw, (max-width: 767px) 468.265625px, (max-width: 991px) 60vw, 44vw"
                srcSet="/images/nima_layer3_1nima_layer3.webp 500w, /images/nima_layer3_1nima_layer3.webp 800w, /images/nima_layer3_1nima_layer3.webp 1080w, /images/nima_layer3_1.webp 1466w"
              />
            </div>
            <div id="w-node-_5a7c5fef-bfea-a8df-fb2b-6f989de5d93c-2990c7dd" className="despre-campanie_text-wrapper">
              <motion.h2 
                className="heading white"
                variants={fadeInUp}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
              >
                Despre campanie
              </motion.h2>
              <div className="_15-spacer"></div>
              <motion.p 
                className="paragraph white"
                variants={fadeInUp}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                transition={{ delay: 0.2 }}
              >
                <a href="https://sanctuarnima.ro/" style={{textDecoration: "underline", textDecorationColor: "var(--orange)"}} target="_blank">
                  <span className="paragraph_emphasis orange link">Sanctuarul Nima</span>
                </a> este primul sanctuar din România destinat animalelor de fermă, înfiinţat în anul 2018 de către Fundaţia Siddhartha. Începând cu ianuarie 2021, Sanctuarul Nima este susținut exclusiv prin atragerea de fonduri din comunitate. <br/><br/>
                Într-o lume in care animalele de fermă sunt obiectivizate, exploatate și omorâte cu mult înainte de vreme, existența unui sanctuar destinat lor poate fi susținută doar printr-un efort colectiv măcar în ceea ce privește nevoile primare de subzistență: <span className="paragraph_emphasis orange">hrana</span>. Sanctuarul are nevoie de <span className="paragraph_emphasis orange">implicarea voastră</span> pentru a oferi în continuare o viaţă fericită animalelor salvate de la abator sau exploatare. <span className="paragraph_emphasis orange">Fiecare SMS</span> asigură o jumătate de balot de fân din cele câteva mii care se consumă în sanctuar lunar.
              </motion.p>
              <div className="_30-spacer"></div>
              <motion.a 
                href="#termene" 
                className="button white w-button"
                variants={fadeInUp}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                transition={{ delay: 0.4 }}
              >
                Termene și condiții
              </motion.a>
            </div>
          </div>
          <div className="_100-spacer"></div>
        </div>
      </section>
      
      <Image 
        src="/images/sanctuarul_nima.webp"
        alt="sanctuarul nima"
        width={2048}
        height={1365}
        loading="eager"
        sizes="100vw"
        className="parallax_scrolling-image"
        srcSet={`
          /images/sanctuarul_nima-p-500.webp 500w,
          /images/sanctuarul_nima-p-800.webp 800w,
          /images/sanctuarul_nima-p-1080.webp 1080w,
          /images/sanctuarul_nima-p-1600.webp 1600w,
          /images/sanctuarul_nima-p-2000.webp 2000w,
          /images/sanctuarul_nima.webp 2048w
        `}
      />
    </>
  )
}
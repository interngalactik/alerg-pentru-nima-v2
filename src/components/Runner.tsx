'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { trackEvent } from '../lib/gtag'

export default function Runner() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { 
    once: true,
    amount: 0.3
  })

  return (
    <section className="section blue" ref={sectionRef}>
      <div className="container centered">
        <div className="_60_spacer"></div>
        <div className="edi_image-wrapper">
          <motion.img 
            className="edi-image"
            src="/images/edi_layer1.png"
            width={485}
            height={485}
            alt="eduard nistru alerg pentru nima sanctuarul nima"
            loading="eager"
            style={{ 
              opacity: isInView ? 1 : 0,
              scale: isInView ? 1 : 0.6,
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
            }}
          />
          <motion.img 
            className="edi-image _2"
            src="/images/edi_layer2.png"
            width={485}
            height={485}
            alt="eduard nistru alerg pentru nima sanctuarul nima"
            loading="eager"
            style={{ 
              opacity: isInView ? 1 : 0,
              transform: isInView ? 'translateY(0)' : 'translateY(-100px)',
              transition: 'opacity 0.6s ease-out 0.4s, transform 0.6s ease-out 0.4s'
            }}
          />
        </div>
        <div className="paragraph smaller white">
          Director executiv <a href="https://naturaumanafilm.ro" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent.externalLinkClick('https://naturaumanafilm.ro/?utm_source=alergpentrunima.ro/#runner')} className="paragraph_emphasis white-link">Natura Umană Film</a>
        </div>
        <div className="edi-paragraph_wrapper">
          <p className="paragraph white">
            M-am apucat de alergare în <span className="paragraph_emphasis orange">ianuarie 2016</span>, iar o lună mai târziu participam la o probă de cros de 15km în natură care mi-a reamintit 
            de <span className="paragraph_emphasis orange">sentimentul de libertate</span> pe care doar cănd eram copil îl mai simțisem. De atunci m-am antrenat, dar nu constant și am participat progresiv la competiții de semimaraton, maraton și ultramaraton, cea mai lungă distanță parcursă fiind de <span className="paragraph_emphasis orange">110km</span> la 100 miles of Istria în 2017 și 2018. În 2020, în timpul pandemiei, mi-am făcut propriul traseu de ultramaraton, de la Sighișoara la Brăduleț, traversând munții Făgăraș și am pornit o campanie de strângeri de fonduri pentru Sanctuarul Nima. Am alergat <span className="paragraph_emphasis orange">140km</span> în două etape din cauza unei accidentări, la cea de-a doua alergare alăturându-mi-se Diana Bejan, și împreună am strâns peste 13.000 de lei, reprezentând o parte din banii pentru una din pășunile sanctuarului.<br /><br />
            Cu această nouă campanie pe care am pornit-o mi-am propus să ajut <a href="https://sanctuarnima.ro" target="_blank" onClick={() => trackEvent.externalLinkClick('https://sanctuarnima.ro')} className="edi-link"><span className="paragraph_emphasis orange link">Sanctuarul Nima</span></a> să strângă cele <span className="paragraph_emphasis orange">7000 de SMS-uri</span> de care ar avea nevoie lunar pentru hrană, alergând câte 1km în schimbul fiecărui mesaj trimis.
          </p>
        </div>
        <div className="_100-spacer"></div>
      </div>
    </section>
  )
}
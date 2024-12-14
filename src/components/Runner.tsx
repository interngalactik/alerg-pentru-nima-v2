'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Runner() {
  const [fadeIn, setFadeIn] = useState(false); // State for fade-in animation

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeIn(true); // Trigger fade-in after a delay
    }, 100); // Adjust the delay as needed

    return () => clearTimeout(timer); // Cleanup on unmount
  }, []);

  return (
    <section className="section blue">
      <div className="container centered">
        <div className="_60_spacer"></div>
        <div className="edi_image-wrapper">
          <Image 
            className="edi-image"
            src="/images/edi_layer1.png"
            width={485}
            height={485}
            alt="eduard nistru alerg pentru nima sanctuarul nima"
            style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }} // Fade-in effect
            loading="eager"
          />
          <Image 
            className="edi-image _2"
            src="/images/edi_layer2.png"
            width={485}
            height={485}
            alt="eduard nistru alerg pentru nima sanctuarul nima"
            style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }} // Fade-in effect
            loading="eager"
          />
        </div>
        <div className="paragraph smaller white">
          Director executiv <a href="https://naturaumanafilm.ro/" target="_blank" rel="noopener noreferrer" className="paragraph_emphasis white-link">Natura Umană Film</a>
        </div>
        <div className="edi-paragraph_wrapper">
          <p className="paragraph white">
            M-am apucat de alergare în <span className="paragraph_emphasis orange">ianuarie 2016</span>, iar o lună mai târziu participam la o probă de cros de 15km în natură care mi-a reamintit 
            de <span className="paragraph_emphasis orange">sentimentul de libertate</span> pe care doar când eram copil îl mai simțisem. De atunci m-am antrenat, dar nu constant și am participat progresiv la competiții de semimaraton, maraton și ultramaraton, cea mai lungă distanță parcursă fiind de <span className="paragraph_emphasis orange">110km</span> la 100 miles of Istria în 2017 și 2018. În 2020, în timpul pandemiei, mi-am făcut propriul traseu de ultramaraton, de la Sighișoara la Brăduleț, traversând munții Făgăraș și am pornit o campanie de strângeri de fonduri pentru Sanctuarul Nima. Am alergat <span className="paragraph_emphasis orange">140km</span> în două etape din cauza unei accidentări, la cea de-a doua alergare alăturându-mi-se Diana Bejan, și împreună am strâns peste 13.000 de lei, reprezentând o parte din banii pentru una din pășunile sanctuarului.<br /><br />
            Cu această nouă campanie pe care am pornit-o mi-am propus să ajut <a href="https://sanctuarnima.ro/" target="_blank" className="edi-link"><span className="paragraph_emphasis orange link">Sanctuarul Nima</span></a> să strângă cele <span className="paragraph_emphasis orange">5000 de SMS-uri</span> de care ar avea nevoie lunar pentru hrană, alergând câte 1km în schimbul fiecărui mesaj trimis.
          </p>
        </div>
        <div className="_100-spacer"></div>
      </div>
    </section>
  );
}
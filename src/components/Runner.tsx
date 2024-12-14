'use client'

import Image from 'next/image'

export default function Runner() {
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
            priority
          />
          <Image 
            className="edi-image _2"
            src="/images/edi_layer2.png"
            width={485}
            height={485}
            alt="eduard nistru alerg pentru nima sanctuarul nima"
          />
        </div>
        <div className="paragraph smaller white">
          Director executiv <a href="https://naturaumanafilm.ro/" target="_blank" rel="noopener noreferrer" className="paragraph_emphasis white-link">Natura Umană Film</a>
        </div>
        <div className="edi-paragraph_wrapper">
          <p className="paragraph white">
            M-am apucat de alergare în <span className="paragraph_emphasis orange">ianuarie 2016</span>, 
            iar o lună mai târziu participam la o probă de cros de 15km în natură care mi-a reamintit 
            de <span className="paragraph_emphasis orange">sentimentul de libertate</span> pe care doar 
            când eram copil îl mai simțisem. {/* Rest of the text */}
          </p>
        </div>
        <div className="_100-spacer"></div>
      </div>
    </section>
  )
}
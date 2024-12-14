'use client'

import Image from 'next/image'

export default function About() {
  return (
    <section id="despre" className="section blue-transparent">
      <div className="container centered">
        <div className="_100-spacer"></div>
        <div className="despre-campanie_wrapper">
          <div className="despre-campanie_images-wrapper">
            <Image 
              className="despre-campanie_image"
              src="/images/nima_layer1_1.webp"
              alt="Sanctuarul Nima"
              width={733}
              height={500}
              priority
            />
            <Image 
              className="despre-campanie_image _2"
              src="/images/nima_layer2_1.webp"
              alt="Sanctuarul Nima"
              width={733}
              height={500}
            />
            <Image 
              className="despre-campanie_image _2"
              src="/images/nima_layer3_1.webp"
              alt="Sanctuarul Nima"
              width={733}
              height={500}
            />
          </div>
          
          <div className="despre-campanie_text-wrapper">
            <h2 className="heading white">Despre campanie</h2>
            <div className="_15-spacer"></div>
            <p className="paragraph white">
              <a 
                href="https://sanctuarnima.ro/" 
                target="_blank"
                rel="noopener noreferrer"
                className="paragraph_emphasis orange link"
              >
                Sanctuarul Nima
              </a> este primul sanctuar din România destinat animalelor de fermă, 
              înfiinţat în anul 2018 de către Fundaţia Siddhartha...
              {/* Rest of the text */}
            </p>
            <div className="_30-spacer"></div>
            <a href="#termene" className="button white w-button">
              Termene și condiții
            </a>
          </div>
        </div>
        <div className="_100-spacer"></div>
      </div>
    </section>
  )
}
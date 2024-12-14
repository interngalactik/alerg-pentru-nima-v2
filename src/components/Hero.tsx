'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function Hero() {
  const [progress, setProgress] = useState({
    kmRun: 2440.25,
    kmGoal: 7000,
    smsCount: 2440.25,
    smsGoal: 7000
  });

  // Animation variants
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

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="section hero-section">
      <div className="container hero">
        <motion.a 
          href="/" 
          className="logo-wrapper"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <Image 
            src="/images/alerg-pentru-nima-logo.svg"
            alt="alerg pentru nima logo sanctuarul nima"
            width={200}
            height={50}
            loading="lazy"
          />
        </motion.a>
        <div className="_100-spacer hero"></div>
        
        {/* Hero Text Section */}
        <motion.div 
          className="hero-text_wrapper"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <h2 className="heading-small">Alătură-te altor <span className="heading-small-emphasis">1318</span> persoane</h2>
          <h1 className="heading hero">Susține Sanctuarul Nima</h1>
          <div className="_15-spacer"></div>
          <div className="hero-paragraph_wrapper">
            <p className="paragraph">Donează <span className="paragraph_emphasis">2 euro / lună</span> pentru hrana animalelor salvate de la abator sau exploatare — <span className="paragraph_emphasis">trimite NIMA prin SMS la 8845</span> iar eu voi alerga pentru fiecare mesaj în parte.</p>
          </div>
          <div className="_15-spacer"></div>
          <a href="#despre" className="button w-button">Vezi detalii</a>
          <div className="_30-spacer"></div>
        </motion.div>

        {/* Hero Image Section - Mobile */}
        <div className="hero-image_wrapper mobile">
          <Image 
            src="/images/hero-min_1.webp"
            alt="eduard nistru sanctuarul nima alerg pentru nima"
            width={1503}
            height={500}
            loading="eager"
            sizes="(max-width: 479px) 97vw, (max-width: 767px) 98vw, 100vw"
            className="hero-image"
            priority
          />
          <div className="vignette"></div>
          <Image 
            src="/images/hero-mobile.webp"
            alt="eduard nistru alerg pentru nima sanctuarul nima"
            width={375}
            height={500}
            loading="lazy"
            className="cutout"
            sizes="(max-width: 479px) 97vw, (max-width: 767px) 98vw, 100vw"
          />
        </div>

        {/* Progress Bars */}
        <motion.div 
          className="progress_wrapper"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ delay: 0.3 }}
        >
          <p className="paragraph smaller">KM*</p>
          <div className="progress-graphic_wrapper">
            <div className="paragraph progress-numbers">
              {progress.kmRun}/{progress.kmGoal}
            </div>
            <motion.div 
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(progress.kmRun / progress.kmGoal) * 100}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <p className="paragraph smaller">* kilometri alergați de la începutul campaniei</p>
        </motion.div>

        <div className="_15-spacer"></div>

        <motion.div 
          className="progress_wrapper"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ delay: 0.4 }}
        >
          <p className="paragraph smaller">SMS**</p>
          <div className="progress-graphic_wrapper">
            <div className="paragraph progress-numbers">
              {progress.smsCount}/{progress.smsGoal}
            </div>
            <motion.div 
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(progress.smsCount / progress.smsGoal) * 100}%` }}
              transition={{ duration: 1, delay: 0.6 }}
            />
          </div>
          <p className="paragraph smaller">** donațiile active din cele necesare hranei animăluțelor în fiecare lună</p>
        </motion.div>
      </div>

      {/* Hero Image Section - Desktop */}
      <motion.div 
        className="hero-image_wrapper"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <Image 
          src="/images/hero-min_1.webp"
          alt="eduard nistru sanctuarul nima alerg pentru nima"
          width={1503}
          height={500}
          loading="eager"
          sizes="100vw"
          className="hero-image"
          priority
        />
        <div className="vignette"></div>
      </motion.div>

      {/* White fade overlay */}
      <div className="hero-white_wrapper">
        <Image 
          src="/images/white-fade_1.webp"
          alt=""
          width={1920}
          height={1080}
          loading="lazy"
          sizes="(max-width: 1920px) 100vw, 1920px"
        />
      </div>
    </section>
  )
}
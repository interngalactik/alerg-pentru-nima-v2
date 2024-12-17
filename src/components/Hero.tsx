'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { STRAVA_CALL_REFRESH, STRAVA_CALL_ACTIVITIES } from '../lib/constants';
import CryptoJS from 'crypto-js'; // Importing CryptoJS for SHA1 hashing

interface StravaActivity {
    type: string;
    distance: number;
}

export default function Hero() {
  const [progress, setProgress] = useState({
    kmRun: 0,
    kmGoal: 7000,
    smsCount: 0,
    smsGoal: 7000
  });

  const [isLoading] = useState(true);
  const [runs] = useState<StravaActivity[]>([]);
  const [error, setError] = useState<string | null>(null); // State for error
  const [lastKmRun, setLastKmRun] = useState(0);

  // Fetch SMS count function
  const fetchSmsCount = async () => {
    const authId = "675";
    const authKey = "8a0e3a142a901c2b9c90c94e40118d07";
    const apiUrl = `https://sms-2w-api.syscomdigital.ro/stats/total-donatori/${authId}`;
    const ts = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current timestamp
    const startDate = new Date('2022-03-15');
    const fromDate = startDate.toISOString().slice(0, 10); // Format: YYYY-MM-DD

    const authorization = sha1(`${authKey}&${ts}`);

    const data = new URLSearchParams({
      authorization: authorization,
      ts: ts,
      'from-date': fromDate,
    });

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: data,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.ok) {
        const responseData = await response.text();
        const arr = responseData.split('"');
        const sms = arr[3]; // Extract the desired value
        setProgress(prev => ({ ...prev, smsCount: parseInt(sms) })); // Update smsCount
      } else {
        setError(`Error: ${response.status}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Fetch error: ${err.message}`);
      } else {
        setError('Fetch error: Unknown error occurred');
      }
    }
  };

  useEffect(() => {
    fetchSmsCount(); // Call fetch function on component mount
    const intervalId = setInterval(fetchSmsCount, 30 * 60 * 1000); // Fetch every 30 minutes

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchSmsCount]);

  const sha1 = (str: string) => {
    return CryptoJS.SHA1(str).toString();
  };

  // Function to check for updates
  const checkForUpdates = useCallback(async () => {
    // Check if we should update based on last check time
    const lastCheckTime = localStorage.getItem('lastCheckTime');
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    if (lastCheckTime && (now - parseInt(lastCheckTime)) < fifteenMinutes) {
      console.log('Skipping check - less than 15 minutes since last check');
      return;
    }

    console.log('Checking for updates...');
    try {
      // Fetch Strava data
      const refreshResponse = await fetch(STRAVA_CALL_REFRESH, {
        method: 'POST'
      });
      const refreshData = await refreshResponse.json();
      
      // Get activities with new token
      const endpoints = [
        `${STRAVA_CALL_ACTIVITIES + refreshData.access_token + '&page=1'}`,
        `${STRAVA_CALL_ACTIVITIES + refreshData.access_token + '&page=2'}`
      ];
      
      const responses = await Promise.all(endpoints.map(endpoint => fetch(endpoint)));
      const allActivities = await Promise.all(responses.map(res => res.json()));
      
      let ALL_ACTIVITIES: StravaActivity[] = [];
      allActivities.forEach((activityArray) => {
        ALL_ACTIVITIES = ALL_ACTIVITIES.concat(activityArray);
      });
      
      const runs = ALL_ACTIVITIES.filter(activity => activity.type === 'Run');
      const totalDistanceMeters = runs.reduce((acc, run) => acc + run.distance, 0);
      const totalDistanceKm = Math.round(totalDistanceMeters * 100 / 1000) / 100;

      // Update only if there's a change
      if (totalDistanceKm !== lastKmRun) {
        setProgress(prev => ({ ...prev, kmRun: totalDistanceKm }));
        setLastKmRun(totalDistanceKm);
        localStorage.setItem('lastKmRun', totalDistanceKm.toString());
      }

      // Save check time after successful update
      localStorage.setItem('lastCheckTime', now.toString());
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }, [lastKmRun]);

  // Load saved kmRun on mount
  useEffect(() => {
    const savedKmRun = localStorage.getItem('lastKmRun');
    if (savedKmRun) {
      const kmRun = parseFloat(savedKmRun);
      setProgress(prev => ({ ...prev, kmRun }));
      setLastKmRun(kmRun);
    }
    
    // Check for updates if it's been more than 15 minutes
    checkForUpdates();
  }, [checkForUpdates]);

  // function getActivities(access: string) {
  //   const endpoints = [`${STRAVA_CALL_ACTIVITIES + access + `&page=1`}`,`${STRAVA_CALL_ACTIVITIES + access + `&page=2`}`];
  //   const fetchPromises = endpoints.map(endpoint => fetch(endpoint));
  //   Promise.all(fetchPromises)
  //   .then(responses => Promise.all(responses.map(res => res.json())))
  //   .then(allActivities => {
  //     let ALL_ACTIVITIES: any[] = [];
  //     allActivities.forEach((activityArray) => {
  //       ALL_ACTIVITIES = ALL_ACTIVITIES.concat(activityArray);
  //     });
  //     const runs = ALL_ACTIVITIES.filter(activity => {
  //         return activity.type === 'Run';
  //     });
  //     setRuns([...runs]);
  //     setIsLoading(prev => !prev);
  //   })
  //   .catch(e => console.log(e));
  // }

  // function showRuns() {
  //   if (isLoading) return <>LOADING</>;
  //   if (!isLoading) {
  //     console.log();
  //     return runs.length;
  //   }
  // }

  const showTotalDistance = useCallback(() => {
    if (isLoading) return <>LOADING</>;
    if (!isLoading) {
      console.log();
      const totalDistanceMeters = runs.reduce((accumulator, run) => {
        return accumulator + run.distance;
      }, 0);

      const totalDistanceKm = Math.round(totalDistanceMeters * 100 / 1000) / 100;

      setProgress(prev => ({ ...prev, kmRun: totalDistanceKm }));
      return totalDistanceKm;
    }
  }, [isLoading, runs]);

  useEffect(() => {
    showTotalDistance();
  }, [showTotalDistance]);

  // Animation variants
  // const fadeInUp = {
  //   hidden: { opacity: 0, y: 20 },
  //   visible: { 
  //     opacity: 1, 
  //     y: 0,
  //     transition: {
  //       duration: 0.6,
  //       ease: "easeOut"
  //     }
  //   }
  // };

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

  const scrollToAbout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const aboutSection = document.querySelector('#despre');
    if (aboutSection) {
      aboutSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
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
          initial={{ 
            opacity: 0,
            x: 100 // Start 100px to the right
          }}
          animate={{ 
            opacity: 1,
            x: 0 // Slide to original position
          }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut",
            delay: 0.2
          }}
          style={{ willChange: 'opacity' }}
        >
          <h2 className="heading-small">Alătură-te altor <span className="heading-small-emphasis">{progress.smsCount}</span> persoane</h2>
          <h1 className="heading hero">Susține Sanctuarul Nima</h1>
          <div className="_15-spacer"></div>
          <div className="hero-paragraph_wrapper">
            <p className="paragraph">Donează <span className="paragraph_emphasis">2 euro / lună</span> pentru hrana animalelor salvate de la abator sau exploatare — <></>
            <a
                href="sms:8845?body=NIMA"
                className="underline paragraph_emphasis"
                style={{ textDecorationColor: 'var(--blue)'}}
              >trimite NIMA prin SMS la 8845</a>, iar eu voi alerga pentru fiecare mesaj în parte.</p>
          </div>
          <div className="_15-spacer"></div>
          <a href="#despre" onClick={scrollToAbout} className="button w-button">Vezi detalii</a>
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
          initial={{ 
            opacity: 0,
            x: 100 // Start 100px to the right
          }}
          animate={{ 
            opacity: 1,
            x: 0 // Slide to original position
          }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut",
            delay: 0.4 // Slightly delayed after hero text
          }}
          style={{ willChange: 'opacity' }}
        >
          <p className="paragraph smaller">KM*</p>
          <div className="progress-graphic_wrapper">
            {progress.kmRun === 0 ? (
              <div className="loading-indicator">LOADING...</div>
            ) : (
              <>
                <div className="paragraph progress-numbers">
                  {progress.kmRun}/{progress.kmGoal}
                </div>
                <motion.div 
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.kmRun / progress.kmGoal) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </>
            )}
          </div>
          <p className="paragraph smaller">* kilometri alergați de la începutul campaniei</p>
        </motion.div>

        <div className="_15-spacer"></div>

        <motion.div 
          className="progress_wrapper"
          initial={{ 
            opacity: 0,
            x: 100 // Start 100px to the right
          }}
          animate={{ 
            opacity: 1,
            x: 0 // Slide to original position
          }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut",
            delay: 0.6 // Further delayed after first progress bar
          }}
          style={{ willChange: 'opacity' }}
        >
          <p className="paragraph smaller">SMS**</p>
          <div className="progress-graphic_wrapper">
            {progress.smsCount === 0 ? (
              <div className="loading-indicator">LOADING...</div>
            ) : (
              <>
                <div className="paragraph progress-numbers">
                  {progress.smsCount}/{progress.smsGoal}
                </div>
                <motion.div 
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.smsCount / progress.smsGoal) * 100}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                />
              </>
            )}
          </div>
          <p className="paragraph smaller">** donațiile active din cele necesare hranei animăluțelor în fiecare lună</p>
        </motion.div>
        
        {error && <p className="paragraph smaller">{error}</p>}
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
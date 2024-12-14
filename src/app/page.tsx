import Hero from '@/components/Hero'
import About from '@/components/About'
import Sponsors from '@/components/Sponsors'
import Runner from '@/components/Runner'
import Calendar from '@/components/Calendar'
import Terms from '@/components/Terms'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Sponsors />
      <Runner />
      <Calendar />
      <Terms />
      <Footer />
    </main>
  )
}
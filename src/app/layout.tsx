import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Alerg pentru Nima — Susține Sanctuarul Nima',
  description: 'Donează 2 euro / lună pentru hrana animalelor salvate de la abator sau exploatare — trimite NIMA prin SMS la 8845 iar eu voi alerga pentru fiecare mesaj în parte.',
  openGraph: {
    title: 'Alerg pentru Nima — Susține Sanctuarul Nima',
    description: 'Donează 2 euro / lună pentru hrana animalelor salvate de la abator sau exploatare — trimite NIMA prin SMS la 8845 iar eu voi alerga pentru fiecare mesaj în parte.',
    images: ['https://cdn.prod.website-files.com/675317edeb0cced92990c7d7/675b4db70569c8b35d0e9718_OPEN%20GRAPH.jpg'],
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  )
}
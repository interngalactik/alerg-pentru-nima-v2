import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>404</h1>
      <p style={{ marginBottom: '1.5rem', color: 'var(--blue, #1a365d)' }}>
        Pagina nu a fost găsită.
      </p>
      <Link
        href="/"
        style={{
          color: 'var(--blue, #1a365d)',
          textDecoration: 'underline',
          fontWeight: 600,
        }}
      >
        Înapoi la prima pagină
      </Link>
    </div>
  )
}

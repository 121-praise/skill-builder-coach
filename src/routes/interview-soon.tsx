export default function InterviewComingSoon() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '24px' }}>
      <h1>Mock Interview</h1>
      <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>Coming soon</p>
      <a href="/dashboard" style={{ padding: '12px 24px', backgroundColor: 'var(--color-text-info)', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
        Back to dashboard
      </a>
    </div>
  );
}
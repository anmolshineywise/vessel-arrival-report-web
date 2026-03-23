import React from 'react'
import ArrivalsPage from './pages/ArrivalsPage'

export default function App() {
  return (
    <div>
      <header style={{ padding: 16, borderBottom: '1px solid #ddd' }}>
        <h1 style={{ margin: 0, color: '#fff' }}>Vessel Arrivals Report</h1>
      </header>
      <main style={{ padding: 16 }}>
        <ArrivalsPage />
      </main>
    </div>
  )
}

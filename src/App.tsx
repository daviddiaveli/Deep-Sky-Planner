import { useState, useEffect } from 'react'
import { Telescope, MapPin, Calendar, Wind, Eye, Info } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'
import { MESSIER_CATALOG, type DeepSkyObject } from './data'
import './App.css'

interface VisibleObject extends DeepSkyObject {
  altitude: number;
  azimuth: number;
}

function App() {
  const [location, setLocation] = useState<{lat: number, lon: number}>({ lat: 50.0755, lon: 14.4378 }) // Výchozí: Praha
  const [date, setDate] = useState(new Date())
  const [visibleObjects, setVisibleObjects] = useState<VisibleObject[]>([])

  // Get User Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        })
      }, (error) => {
        console.warn("GPS error, using default location:", error)
      })
    }
  }, [])

  // Update Time and Calculations
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 10000) // Update every 10s
    
    const observer = new Astronomy.Observer(location.lat, location.lon, 0)
    
    try {
      const calculated = MESSIER_CATALOG.map(obj => {
        // Použití explicitního AstroTime pro jistotu
        const hor = Astronomy.Horizon(new Date(date), observer, obj.ra, obj.dec, 'normal')
        
        return {
          ...obj,
          altitude: hor.altitude,
          azimuth: hor.azimuth
        }
      })
      .sort((a, b) => b.altitude - a.altitude)
      
      setVisibleObjects(calculated)
    } catch (err) {
      console.error("Chyba při výpočtu souřadnic:", err)
    }

    return () => clearInterval(timer)
  }, [location, date])

  return (
    <div className="app-container">
      <header className="header">
        <Telescope size={32} color="#60a5fa" />
        <h1>Deep Sky Planner</h1>
      </header>

      <main className="dashboard">
        <section className="card">
          <h2><MapPin size={18} /> Lokalita</h2>
          {location ? (
            <div className="stats">
              {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
            </div>
          ) : (
            <div className="stats">Zjišťování...</div>
          )}
        </section>

        <section className="card">
          <h2><Calendar size={18} /> Datum a čas</h2>
          <div className="stats">
            {date.toLocaleDateString('cs-CZ')}
          </div>
          <p>{date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
        </section>

        <section className="card">
          <h2><Wind size={18} /> Podmínky</h2>
          <div className="stats">Jasno</div>
          <p>Bortle: 4 (Venkovské nebe)</p>
        </section>
      </main>

      <section className="object-list" style={{ marginTop: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Eye size={24} color="#a855f7" /> Aktuálně viditelné objekty
        </h2>
        <div className="grid-list">
          {visibleObjects.map(obj => (
            <div key={obj.id} className="card object-card" style={{ 
              borderLeft: obj.altitude > 0 ? '4px solid #10b981' : '4px solid #ef4444',
              marginBottom: '1rem',
              opacity: obj.altitude > 0 ? 1 : 0.6
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{obj.name} - {obj.commonName}</h3>
                  <p style={{ margin: '0.2rem 0', color: '#94a3b8' }}>{obj.type} | Magnituda: {obj.magnitude}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: obj.altitude > 0 ? '#10b981' : '#ef4444' }}>
                    {obj.altitude.toFixed(1)}° nad obzorem
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Azimut: {obj.azimuth.toFixed(1)}°</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: '3rem', padding: '1rem', borderTop: '1px solid #1e293b', color: '#64748b', fontSize: '0.9rem' }}>
        <p><Info size={14} style={{ verticalAlign: 'middle' }} /> Data jsou počítána v reálném čase pomocí astronomy-engine.</p>
      </footer>
    </div>
  )
}

export default App

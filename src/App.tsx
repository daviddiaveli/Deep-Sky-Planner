import { useState, useEffect, useMemo } from 'react'
import { Telescope, MapPin, Calendar, Wind, Eye, Info, Filter, BarChart3 } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts'
import { MESSIER_CATALOG, type DeepSkyObject } from './data'
import './App.css'

interface VisibleObject extends DeepSkyObject {
  altitude: number;
  azimuth: number;
}

function App() {
  const [location, setLocation] = useState<{lat: number, lon: number}>({ lat: 50.0755, lon: 14.4378 })
  const [date, setDate] = useState(new Date())
  const [visibleObjects, setVisibleObjects] = useState<VisibleObject[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState<string>('M31')
  const [filterType, setFilterType] = useState<string>('All')
  const [maxMag, setMaxMag] = useState<number>(10)

  // Get User Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({ lat: position.coords.latitude, lon: position.coords.longitude })
      }, (err) => console.warn("GPS error:", err))
    }
  }, [])

  // Update Time and Basic Calculations
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 30000)
    
    const observer = new Astronomy.Observer(location.lat, location.lon, 0)
    const calculated = MESSIER_CATALOG.map(obj => {
      const hor = Astronomy.Horizon(new Date(), observer, obj.ra, obj.dec, 'normal')
      return { ...obj, altitude: hor.altitude, azimuth: hor.azimuth }
    }).sort((a, b) => b.altitude - a.altitude)
    
    setVisibleObjects(calculated)
    return () => clearInterval(timer)
  }, [location])

  // Filtering Logic
  const filteredObjects = useMemo(() => {
    return visibleObjects.filter(obj => {
      const typeMatch = filterType === 'All' || obj.type === filterType
      const magMatch = obj.magnitude <= maxMag
      return typeMatch && magMatch
    })
  }, [visibleObjects, filterType, maxMag])

  // Chart Data Generation (Altitude over 24 hours)
  const chartData = useMemo(() => {
    const selected = MESSIER_CATALOG.find(o => o.id === selectedObjectId)
    if (!selected || !location) return []

    const data = []
    const observer = new Astronomy.Observer(location.lat, location.lon, 0)
    const startTime = new Date()
    startTime.setMinutes(0, 0, 0)

    for (let i = 0; i <= 24; i++) {
      const time = new Date(startTime.getTime() + i * 60 * 60 * 1000)
      const hor = Astronomy.Horizon(time, observer, selected.ra, selected.dec, 'normal')
      data.push({
        time: time.getHours() + ':00',
        altitude: Math.max(0, hor.altitude),
        fullTime: time.toLocaleTimeString()
      })
    }
    return data
  }, [selectedObjectId, location])

  const selectedObject = MESSIER_CATALOG.find(o => o.id === selectedObjectId)

  return (
    <div className="app-container">
      <header className="header">
        <Telescope size={32} color="#60a5fa" />
        <h1>Deep Sky Planner</h1>
      </header>

      <div className="dashboard">
        <section className="card">
          <h2><MapPin size={18} /> Lokalita</h2>
          <div className="stats">{location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°</div>
        </section>

        <section className="card">
          <h2><Calendar size={18} /> Datum a čas</h2>
          <div className="stats">{date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</div>
          <p>{date.toLocaleDateString('cs-CZ')}</p>
        </section>

        <section className="card">
          <h2><Wind size={18} /> Počasí (Simulace)</h2>
          <div className="stats" style={{ color: '#10b981' }}>Jasno</div>
          <p>Vlhkost: 45% | Seeing: Excelentní</p>
        </section>
      </div>

      <div className="chart-container card">
        <h2><BarChart3 size={20} /> Graf výšky: {selectedObject?.commonName || selectedObject?.name} (24h)</h2>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis unit="°" domain={[0, 90]} stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
              itemStyle={{ color: '#a855f7' }}
            />
            <ReferenceLine y={0} stroke="#ef4444" />
            <Area type="monotone" dataKey="altitude" stroke="#a855f7" fillOpacity={1} fill="url(#colorAlt)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <section className="controls" style={{ marginTop: '2rem' }}>
        <div className="filter-group">
          <Filter size={18} />
          <label>Typ:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="All">Všechny</option>
            <option value="Galaxy">Galaxie</option>
            <option value="Nebula">Mlhoviny</option>
            <option value="Star Cluster">Hvězdokupy</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Max Magnituda:</label>
          <input 
            type="range" min="0" max="15" step="0.5" 
            value={maxMag} onChange={(e) => setMaxMag(parseFloat(e.target.value))} 
          />
          <span>{maxMag}</span>
        </div>
      </section>

      <section className="object-list">
        <h2><Eye size={24} color="#a855f7" /> Objekty k pozorování</h2>
        <div className="grid-list">
          {filteredObjects.map(obj => (
            <div 
              key={obj.id} 
              className={`card object-card ${selectedObjectId === obj.id ? 'selected' : ''}`}
              onClick={() => setSelectedObjectId(obj.id)}
              style={{ borderLeft: obj.altitude > 0 ? '4px solid #10b981' : '4px solid #ef4444' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{obj.name}</h3>
                  <small>{obj.commonName}</small>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Mag: {obj.magnitude} | {obj.type}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: obj.altitude > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {obj.altitude.toFixed(1)}°
                  </div>
                  <small>Az: {obj.azimuth.toFixed(0)}°</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: '3rem', color: '#64748b', textAlign: 'center' }}>
        <p>Deep Sky Planner - Astronomické plánování v reálném čase</p>
      </footer>
    </div>
  )
}

export default App

import { useState, useEffect, useMemo } from 'react'
import { Telescope, MapPin, Calendar, Wind, Eye, Info, Filter, BarChart3, Globe, Search } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import { MESSIER_CATALOG, TRANSLATIONS, type DeepSkyObject } from './data'
import './App.css'

// Fix for Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

interface VisibleObject extends DeepSkyObject {
  altitude: number;
  azimuth: number;
}

// Map helper to update view
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap()
  map.setView(center, map.getZoom())
  return null
}

function App() {
  const [lang, setLang] = useState<'en' | 'cz'>('cz')
  const t = TRANSLATIONS[lang]

  const [location, setLocation] = useState<{lat: number, lon: number}>({ lat: 50.0755, lon: 14.4378 })
  const [date, setDate] = useState(new Date())
  const [visibleObjects, setVisibleObjects] = useState<VisibleObject[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState<string>('M31')
  const [filterType, setFilterType] = useState<string>('All')
  const [maxMag, setMaxMag] = useState<number>(10)
  const [searchQuery, setSearchQuery] = useState('')

  // Get User Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({ lat: position.coords.latitude, lon: position.coords.longitude })
      })
    }
  }, [])

  // Update Calculations
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

  // Filtering & Search Logic
  const filteredObjects = useMemo(() => {
    return visibleObjects.filter(obj => {
      const typeMatch = filterType === 'All' || obj.type === filterType
      const magMatch = obj.magnitude <= maxMag
      const searchMatch = obj.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          obj.commonName[lang].toLowerCase().includes(searchQuery.toLowerCase())
      return typeMatch && magMatch && searchMatch
    })
  }, [visibleObjects, filterType, maxMag, searchQuery, lang])

  // Chart Data
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
      data.push({ time: time.getHours() + ':00', altitude: Math.max(0, hor.altitude) })
    }
    return data
  }, [selectedObjectId, location])

  const selectedObject = MESSIER_CATALOG.find(o => o.id === selectedObjectId)

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <Telescope size={32} color="#60a5fa" />
          <h1>{t.title}</h1>
        </div>
        <div className="lang-switch">
          <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
          <button className={`lang-btn ${lang === 'cz' ? 'active' : ''}`} onClick={() => setLang('cz')}>CZ</button>
        </div>
      </header>

      <div className="dashboard">
        <section className="card">
          <h2><MapPin size={18} /> {t.location}</h2>
          <div className="stats">{location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°</div>
        </section>
        <section className="card">
          <h2><Calendar size={18} /> {t.dateTime}</h2>
          <div className="stats">{date.toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</div>
          <p>{date.toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'en-US')}</p>
        </section>
        <section className="card">
          <h2><Wind size={18} /> {t.weather}</h2>
          <div className="stats" style={{ color: '#10b981' }}>{t.clear}</div>
          <p>{t.humidity}: 45% | {t.seeing}: {t.excellent}</p>
        </section>
      </div>

      <div className="chart-container card">
        <h2><BarChart3 size={20} /> {t.altitudeChart}: {selectedObject?.name} - {selectedObject?.commonName[lang]} ({t.over24h})</h2>
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
            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="altitude" stroke="#a855f7" fill="url(#colorAlt)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <section className="map-container card">
        <h2><Globe size={20} /> {t.darkSkyMap}</h2>
        <MapContainer center={[location.lat, location.lon]} zoom={6} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Light Pollution Overlay - Using a public TileServer for demonstration if available, 
              or just showing location marker for now */}
          <TileLayer
            url="https://map1.viskan.com/lightpollution/{z}/{x}/{y}.png"
            opacity={0.5}
          />
          <ChangeView center={[location.lat, location.lon]} />
          <Marker position={[location.lat, location.lon]}>
            <Popup>Vaše poloha</Popup>
          </Marker>
        </MapContainer>
      </section>

      <section className="controls" style={{ marginTop: '2rem' }}>
        <div className="filter-group">
          <Filter size={18} />
          <label>{t.type}:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="All">{t.all}</option>
            <option value="Galaxy">{t.galaxy}</option>
            <option value="Nebula">{t.nebula}</option>
            <option value="Star Cluster">{t.starCluster}</option>
          </select>
        </div>
        <div className="filter-group">
          <label>{t.maxMag}:</label>
          <input type="range" min="0" max="15" step="0.5" value={maxMag} onChange={(e) => setMaxMag(parseFloat(e.target.value))} />
          <span>{maxMag}</span>
        </div>
        <div className="filter-group">
          <Search size={18} />
          <input className="search-input" placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </section>

      <section className="object-list">
        <h2><Eye size={24} color="#a855f7" /> {t.objects}</h2>
        <div className="grid-list">
          {filteredObjects.map(obj => (
            <div key={obj.id} className={`card object-card ${selectedObjectId === obj.id ? 'selected' : ''}`} onClick={() => setSelectedObjectId(obj.id)} style={{ borderLeft: obj.altitude > 0 ? '4px solid #10b981' : '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{obj.name}</h3>
                  <small>{obj.commonName[lang]}</small>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Mag: {obj.magnitude} | {obj.type}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: obj.altitude > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{obj.altitude.toFixed(1)}°</div>
                  <small>{t.az}: {obj.azimuth.toFixed(0)}°</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: '3rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>
        <p>{t.footer}</p>
      </footer>
    </div>
  )
}

export default App

import { useState, useEffect, useMemo } from 'react'
import { Telescope, MapPin, Calendar, Wind, Eye, Info, Filter, BarChart3, Globe, Search } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import { MESSIER_CATALOG, TRANSLATIONS, type DeepSkyObject } from './data'
import './index.css'

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

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
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

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({ lat: position.coords.latitude, lon: position.coords.longitude })
      })
    }
  }, [])

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

  const filteredObjects = useMemo(() => {
    return visibleObjects.filter(obj => {
      const typeMatch = filterType === 'All' || obj.type === filterType
      const magMatch = obj.magnitude <= maxMag
      const searchMatch = obj.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          obj.commonName[lang].toLowerCase().includes(searchQuery.toLowerCase())
      return typeMatch && magMatch && searchMatch
    })
  }, [visibleObjects, filterType, maxMag, searchQuery, lang])

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
          <Telescope size={40} color="#8b5cf6" />
          <h1>{t.title}</h1>
        </div>
        <div className="lang-switch">
          <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
          <button className={`lang-btn ${lang === 'cz' ? 'active' : ''}`} onClick={() => setLang('cz')}>CZ</button>
        </div>
      </header>

      <div className="dashboard">
        <section className="card">
          <div className="stat-label"><MapPin size={16} /> {t.location}</div>
          <div className="stat-value">{location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°</div>
        </section>
        <section className="card">
          <div className="stat-label"><Calendar size={16} /> {t.dateTime}</div>
          <div className="stat-value">{date.toLocaleTimeString(lang === 'cz' ? 'cs-CZ' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</div>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{date.toLocaleDateString(lang === 'cz' ? 'cs-CZ' : 'en-US')}</p>
        </section>
        <section className="card">
          <div className="stat-label"><Wind size={16} /> {t.weather}</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{t.clear}</div>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t.humidity}: 45% | {t.seeing}: {t.excellent}</p>
        </section>
      </div>

      <div className="chart-container card">
        <div className="chart-header">
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <BarChart3 size={24} color="#8b5cf6" /> 
            {selectedObject?.name} - {selectedObject?.commonName[lang]}
          </h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.altitudeChart} ({t.over24h})</span>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis unit="°" domain={[0, 90]} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              itemStyle={{ color: '#8b5cf6' }}
            />
            <Area type="monotone" dataKey="altitude" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorAlt)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <section className="map-container card">
        <div className="stat-label" style={{ marginBottom: '1.2rem' }}><Globe size={18} /> {t.darkSkyMap}</div>
        <MapContainer center={[location.lat, location.lon]} zoom={6} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <TileLayer
            url="https://map1.viskan.com/lightpollution/{z}/{x}/{y}.png"
            opacity={0.4}
          />
          <ChangeView center={[location.lat, location.lon]} />
          <Marker position={[location.lat, location.lon]}>
            <Popup>Lokalita pozorování</Popup>
          </Marker>
        </MapContainer>
      </section>

      <section className="controls">
        <div className="control-item">
          <label>{t.type}</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="All">{t.all}</option>
            <option value="Galaxy">{t.galaxy}</option>
            <option value="Nebula">{t.nebula}</option>
            <option value="Star Cluster">{t.starCluster}</option>
            <option value="Planetary Nebula">{t.planetaryNebula}</option>
          </select>
        </div>
        <div className="control-item">
          <label>{t.maxMag} ({maxMag})</label>
          <input type="range" min="0" max="15" step="0.5" value={maxMag} onChange={(e) => setMaxMag(parseFloat(e.target.value))} style={{ width: '150px' }} />
        </div>
        <div className="control-item" style={{ flexGrow: 1 }}>
          <label>{t.search}</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="search-input" style={{ paddingLeft: '36px', width: '100%' }} placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="object-list">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
          <Eye size={28} color="#8b5cf6" /> {t.objects}
        </h2>
        <div className="grid-list">
          {filteredObjects.map(obj => (
            <div 
              key={obj.id} 
              className={`card object-card ${selectedObjectId === obj.id ? 'selected' : ''} ${obj.altitude > 0 ? 'visible' : ''}`} 
              onClick={() => setSelectedObjectId(obj.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 className="obj-name">{obj.name}</h3>
                  <div className="obj-meta">{obj.commonName[lang]}</div>
                  <div className="obj-meta" style={{ marginTop: '0.8rem' }}>
                    <span style={{ color: 'var(--accent-secondary)' }}>{obj.type}</span> • Mag {obj.magnitude}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`alt-badge ${obj.altitude <= 0 ? 'below' : ''}`}>
                    {obj.altitude.toFixed(1)}°
                  </div>
                  <div className="obj-meta" style={{ marginTop: '0.5rem' }}>{t.az}: {obj.azimuth.toFixed(0)}°</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: '4rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--glass-border)' }}>
        <p>{t.footer}</p>
      </footer>
    </div>
  )
}

export default App

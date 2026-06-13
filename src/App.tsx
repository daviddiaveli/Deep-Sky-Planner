import { useState, useEffect, useMemo } from 'react'
import { Telescope, MapPin, Calendar, Wind, Eye, Info, Filter, BarChart3, Globe, Search, Moon, Sun } from 'lucide-react'
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
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [moonPhase, setMoonPhase] = useState(0)
  const [sunRise, setSunRise] = useState<Date | null>(null)
  const [sunSet, setSunSet] = useState<Date | null>(null)
  const [astroTwilight, setAstroTwilight] = useState<Date | null>(null)
  const [weatherData, setWeatherData] = useState<any>(null)
  const [nightPlan, setNightPlan] = useState<string[]>([])
  const [observations, setObservations] = useState<Record<string, string>>({})

  // Load from LocalStorage
  useEffect(() => {
    const savedPlan = localStorage.getItem('nightPlan')
    const savedObs = localStorage.getItem('observations')
    if (savedPlan) setNightPlan(JSON.parse(savedPlan))
    if (savedObs) setObservations(JSON.parse(savedObs))
  }, [])

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('nightPlan', JSON.stringify(nightPlan))
    localStorage.setItem('observations', JSON.stringify(observations))
  }, [nightPlan, observations])

  // Atmospheric Engine (7Timer!)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(`https://www.7timer.info/bin/astro.php?lon=${location.lon}&lat=${location.lat}&ac=0&unit=metric&output=json`)
        const data = await response.json()
        setWeatherData(data.dataseries[0])
      } catch (err) {
        console.error("Weather fetch failed:", err)
      }
    }
    fetchWeather()
  }, [location])

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
    
    // Core object calculations
    const calculated = MESSIER_CATALOG.map(obj => {
      const hor = Astronomy.Horizon(new Date(), observer, obj.ra, obj.dec, 'normal')
      return { ...obj, altitude: hor.altitude, azimuth: hor.azimuth }
    }).sort((a, b) => b.altitude - a.altitude)
    
    setVisibleObjects(calculated)

    // Astronomy additional data
    const astroTime = new Astronomy.AstroTime(date)
    setMoonPhase(Astronomy.MoonPhase(astroTime))
    
    const nextRise = Astronomy.SearchRiseSet('Sun', observer, 1, date, 1)
    const nextSet = Astronomy.SearchRiseSet('Sun', observer, -1, date, 1)
    if (nextRise) setSunRise(nextRise.date)
    if (nextSet) {
      setSunSet(nextSet.date)
      // Astro Twilight is when Sun is 18 degrees below horizon
      const twilight = Astronomy.SearchRiseSet('Sun', observer, -1, date, 1, 18)
      if (twilight) setAstroTwilight(twilight.date)
    }

    return () => clearInterval(timer)
  }, [location, date])

  const suggestions = useMemo(() => {
    if (!searchQuery) return []
    return MESSIER_CATALOG.filter(obj => 
      obj.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      obj.commonName[lang].toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5)
  }, [searchQuery, lang])

  const filteredObjects = useMemo(() => {
    return visibleObjects.filter(obj => {
      const typeMatch = filterType === 'All' || obj.type === filterType
      const magMatch = obj.magnitude <= maxMag
      const searchMatch = !searchQuery || 
                          obj.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
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

      {/* NEW HERO SEARCH SECTION */}
      <section className="hero-search">
        <div className="search-wrapper">
          <Search className="search-icon-hero" size={28} />
          <input 
            className="hero-search-input" 
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map(obj => (
                <li 
                  key={obj.id} 
                  className="suggestion-item"
                  onClick={() => {
                    setSelectedObjectId(obj.id)
                    setSearchQuery(obj.name)
                    setShowSuggestions(false)
                  }}
                >
                  <span className="suggestion-name">{obj.name} - {obj.commonName[lang]}</span>
                  <span className="suggestion-meta">{obj.type} • Mag {obj.magnitude}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="dashboard">
        <section className="card">
          <div className="stat-label"><MapPin size={16} /> {t.location}</div>
          <div className="stat-value">{location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°</div>
        </section>
        <section className="card">
          <div className="stat-label"><Moon size={16} /> {t.moonPhase}</div>
          <div className="stat-value">{moonPhase.toFixed(0)}°</div>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{moonPhase > 180 ? 'Waning' : 'Waxing'}</p>
        </section>
        <section className="card">
          <div className="stat-label"><Sun size={16} /> {t.sunTimes}</div>
          <div className="stat-value">{sunSet ? sunSet.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t.twilight}: {astroTwilight ? astroTwilight.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</p>
        </section>
        <section className="card">
          <div className="stat-label"><Wind size={16} /> {t.weather}</div>
          {weatherData ? (
            <>
              <div className="stat-value" style={{ color: weatherData.cloudcover <= 2 ? '#10b981' : '#f59e0b' }}>
                {weatherData.cloudcover <= 2 ? t.clear : t.cloudCover}
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                {t.seeing}: {9 - weatherData.seeing}/8 | {t.transparency}: {9 - weatherData.transparency}/8
              </p>
            </>
          ) : <div className="stat-value">...</div>}
        </section>
      </div>

      <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="chart-container card" style={{ margin: 0 }}>
          <div className="chart-header">
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <BarChart3 size={24} color="#8b5cf6" /> 
              {selectedObject?.name}
            </h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.altitudeChart}</span>
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

        <div className="imaging-container card">
          <div className="stat-label"><Eye size={18} /> {t.imaging}</div>
          {selectedObject && (
            <div style={{ borderRadius: '12px', overflow: 'hidden', height: '350px', position: 'relative' }}>
              <iframe 
                src={`https://aladin.u-strasbg.fr/AladinLite/app/?target=${selectedObject.name}&fov=1&survey=P%2FDSs2%2Fcolor`}
                width="100%" 
                height="100%" 
                style={{ border: 'none' }}
                title="Aladin Lite"
              />
            </div>
          )}
        </div>
      </div>

      <section className="map-container card">
        <div className="stat-label" style={{ marginBottom: '1.2rem' }}><Globe size={18} /> {t.darkSkyMap}</div>
        <MapContainer center={[location.lat, location.lon]} zoom={6} scrollWheelZoom={true} style={{ height: '400px', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* STABLE LIGHT POLLUTION LAYER - David Lorenz (Sky Brightness Atlas) */}
          <TileLayer
            url="https://djlorenz.github.io/astronomy/lp2022/tiles/{z}/{x}/{y}.png"
            opacity={0.6}
            maxNativeZoom={12}
            attribution="&copy; David Lorenz, Sky Brightness Atlas"
          />
          <ChangeView center={[location.lat, location.lon]} />
          <Marker position={[location.lat, location.lon]}>
            <Popup>Lokalita pozorování</Popup>
          </Marker>
        </MapContainer>
      </section>

      <section className="logbook card" style={{ marginTop: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
          <Calendar size={28} color="#8b5cf6" /> {t.nightPlan}
        </h2>
        <div className="grid-list">
          {nightPlan.map(objId => {
            const obj = MESSIER_CATALOG.find(o => o.id === objId)
            if (!obj) return null
            return (
              <div key={obj.id} className="card" style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3>{obj.id} - {obj.commonName[lang]}</h3>
                  <button onClick={() => setNightPlan(prev => prev.filter(id => id !== objId))} className="lang-btn" style={{ color: '#ef4444' }}>{t.removeFromPlan}</button>
                </div>
                <textarea 
                  placeholder={t.notes}
                  value={observations[objId] || ''}
                  onChange={(e) => setObservations(prev => ({ ...prev, [objId]: e.target.value }))}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '0.5rem', borderRadius: '8px', marginTop: '1rem', minHeight: '80px' }}
                />
              </div>
            )
          })}
        </div>
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
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!nightPlan.includes(obj.id)) setNightPlan(prev => [...prev, obj.id])
                    }}
                    className="lang-btn" 
                    style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.7rem' }}
                  >
                    {t.addToPlan}
                  </button>
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

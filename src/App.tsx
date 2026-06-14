import { useState, useEffect, useMemo } from 'react'
import { Telescope, MapPin, Calendar, Wind, Eye, Info, BarChart3, Globe, Search, Moon, Sun } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { MESSIER_CATALOG, TRANSLATIONS, type DeepSkyObject } from './data'
import './index.css'

// Fix for Leaflet marker icons
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
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom())
    }
  }, [center, map])
  return null
}

function App() {
  const [lang, setLang] = useState<'en' | 'cz'>('cz')
  const t = useMemo(() => TRANSLATIONS[lang], [lang])

  const [location, setLocation] = useState<{lat: number, lon: number}>({ lat: 50.0755, lon: 14.4378 })
  const [date, setDate] = useState(new Date())
  const [selectedObjectId, setSelectedObjectId] = useState<string>('M31')
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [maxMag, setMaxMag] = useState<number>(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [moonPhase, setMoonPhase] = useState(0)
  const [sunSet, setSunSet] = useState<Date | null>(null)
  const [astroTwilight, setAstroTwilight] = useState<Date | null>(null)
  const [weatherData, setWeatherData] = useState<any>(null)
  const [nightPlan, setNightPlan] = useState<string[]>([])
  const [observations, setObservations] = useState<Record<string, string>>({})
  const [showFAQ, setShowFAQ] = useState(false)
  const [issPasses, setIssPasses] = useState<any[]>([])

  const planetNames = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

  // ISS Flyovers Logic
  useEffect(() => {
    const fetchIssTle = async () => {
      try {
        const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle')
        const tle = await response.text()
        const lines = tle.split('\n').filter(l => l.trim())
        if (lines.length >= 2) {
          const observer = new Astronomy.Observer(location.lat, location.lon, 0)
          const sat = new Astronomy.Satellite(lines[0], lines[1], lines[2] || lines[1]) // lines[0] is often name
          
          const passes = []
          let searchTime = new Date(date)
          for (let i = 0; i < 5; i++) { // Find next 5 passes
            const pass = Astronomy.SearchRiseSet(sat, observer, 1, searchTime, 1)
            if (pass) {
              const maxAlt = Astronomy.SearchAltitude(sat, observer, 1, pass.date, 0.1, 0) // rough
              passes.push({
                start: pass.date,
                duration: 5, // placeholder as SearchRiseSet doesn't give end directly easily without multiple calls
                maxAlt: 60 // placeholder
              })
              searchTime = new Date(pass.date.getTime() + 90 * 60 * 1000)
            } else break
          }
          setIssPasses(passes)
        }
      } catch (err) {
        console.warn("ISS TLE fetch failed", err)
      }
    }
    if (location) fetchIssTle()
  }, [location])

  // PDF Export Logic
  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text(t.title, 14, 20)
    doc.setFontSize(12)
    doc.text(`${t.location}: ${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`, 14, 30)
    doc.text(`${t.dateTime}: ${date.toLocaleString()}`, 14, 37)

    const tableData = nightPlan.map(id => {
      const obj = allObjects.find(o => o.id === id)
      return [
        obj?.id || '',
        obj?.commonName[lang] || '',
        `${obj?.altitude.toFixed(1)}°`,
        obj?.type || '',
        observations[id] || ''
      ]
    })

    autoTable(doc, {
      startY: 45,
      head: [[ 'ID', 'Name', 'Alt', 'Type', 'Notes']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] }
    })

    doc.save(`DeepSkyPlan_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Core calculations and Planets data
  const allObjects = useMemo(() => {
    try {
      const observer = new Astronomy.Observer(location.lat, location.lon, 0)
      const astroTime = new Astronomy.AstroTime(date)
      
      const messier = MESSIER_CATALOG.map(obj => {
        try {
          const hor = Astronomy.Horizon(astroTime, observer, obj.ra, obj.dec, 'normal')
          return { ...obj, altitude: hor.altitude, azimuth: hor.azimuth } as VisibleObject
        } catch (e) {
          return { ...obj, altitude: -90, azimuth: 0 } as VisibleObject
        }
      })

      const planets = planetNames.map(name => {
        try {
          const equator = Astronomy.Equator(name as any, astroTime, observer, true, true)
          const hor = Astronomy.Horizon(astroTime, observer, equator.ra, equator.dec, 'normal')
          const pKey = name.toLowerCase()
          return {
            id: name,
            name: name,
            commonName: { en: name, cz: (t as any)[pKey] || name },
            type: 'Planet' as any,
            ra: equator.ra,
            dec: equator.dec,
            magnitude: -1,
            altitude: hor.altitude,
            azimuth: hor.azimuth
          } as VisibleObject
        } catch (e) {
          return null
        }
      }).filter(Boolean) as VisibleObject[]

      return [...messier, ...planets]
    } catch (err) {
      console.error("Critical calculation error:", err)
      return []
    }
  }, [location, date, lang, t])

  // Weather fetch (Open-Meteo)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=cloud_cover,relative_humidity_2m,visibility&forecast_days=1`)
        const data = await response.json()
        if (data && data.current) {
          setWeatherData({
            cloudcover: Math.round(data.current.cloud_cover / 12.5),
            transparency: Math.round(data.current.visibility / 5000),
            humidity: data.current.relative_humidity_2m
          })
        }
      } catch (err) {
        setWeatherData({ cloudcover: 0, transparency: 6, humidity: 50 })
      }
    }
    fetchWeather()
  }, [location])

  // Persistence
  useEffect(() => {
    const savedPlan = localStorage.getItem('nightPlan')
    const savedObs = localStorage.getItem('observations')
    if (savedPlan) { try { setNightPlan(JSON.parse(savedPlan)) } catch(e) {} }
    if (savedObs) { try { setObservations(JSON.parse(savedObs)) } catch(e) {} }
  }, [])

  useEffect(() => {
    localStorage.setItem('nightPlan', JSON.stringify(nightPlan))
    localStorage.setItem('observations', JSON.stringify(observations))
  }, [nightPlan, observations])

  // GPS
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({ lat: position.coords.latitude, lon: position.coords.longitude })
      }, (err) => console.warn("GPS failed", err))
    }
  }, [])

  // Time and Sun
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 30000)
    try {
      const observer = new Astronomy.Observer(location.lat, location.lon, 0)
      const astroTime = new Astronomy.AstroTime(date)
      setMoonPhase(Astronomy.MoonPhase(astroTime))
      const nextRise = Astronomy.SearchRiseSet('Sun' as any, observer, 1, astroTime, 1)
      const nextSet = Astronomy.SearchRiseSet('Sun' as any, observer, -1, astroTime, 1)
      
      if (nextSet) {
        const setDateVal = (nextSet as any).date || nextSet
        setSunSet(setDateVal)
        try {
          const twilight = Astronomy.SearchAltitude('Sun' as any, observer, -1, astroTime, 1, -18)
          if (twilight) setAstroTwilight((twilight as any).date || twilight)
        } catch(e) {
          setAstroTwilight(new Date(setDateVal.getTime() + 90 * 60 * 1000))
        }
      }
    } catch (err) {}
    return () => clearInterval(timer)
  }, [location, date])

  const filteredObjects = useMemo(() => {
    return allObjects.filter(obj => {
      let catMatch = true
      if (selectedCat === 'galaxies') catMatch = obj.type === 'Galaxy'
      if (selectedCat === 'clusters') catMatch = obj.type === 'Star Cluster'
      if (selectedCat === 'nebulae') catMatch = (obj.type === 'Nebula' || obj.type === 'Planetary Nebula')
      if (selectedCat === 'planets') catMatch = obj.type === 'Planet'
      const magMatch = obj.type === 'Planet' ? true : obj.magnitude <= maxMag
      const searchMatch = !searchQuery || obj.name.toLowerCase().includes(searchQuery.toLowerCase()) || obj.commonName[lang].toLowerCase().includes(searchQuery.toLowerCase())
      return catMatch && magMatch && searchMatch
    }).sort((a, b) => b.altitude - a.altitude)
  }, [allObjects, selectedCat, maxMag, searchQuery, lang])

  const suggestions = useMemo(() => {
    if (!searchQuery) return []
    return filteredObjects.slice(0, 8)
  }, [searchQuery, filteredObjects])

  const chartData = useMemo(() => {
    const selected = allObjects.find(o => o.id === selectedObjectId) || allObjects[0]
    if (!selected) return []
    const data = []
    const observer = new Astronomy.Observer(location.lat, location.lon, 0)
    const startTime = new Date(date)
    startTime.setMinutes(0, 0, 0)
    for (let i = 0; i <= 24; i++) {
      const time = new Date(startTime.getTime() + i * 60 * 60 * 1000)
      const astroTime = new Astronomy.AstroTime(time)
      let curRa = selected.ra; let curDec = selected.dec
      if (selected.type === 'Planet') {
        try {
          const eq = Astronomy.Equator(selected.name as any, astroTime, observer, true, true)
          curRa = eq.ra; curDec = eq.dec
        } catch(e) {}
      }
      const hor = Astronomy.Horizon(astroTime, observer, curRa, curDec, 'normal')
      data.push({ time: time.getHours() + ':00', altitude: Math.max(0, hor.altitude) })
    }
    return data
  }, [selectedObjectId, location, allObjects, date])

  const selectedObject = useMemo(() => allObjects.find(o => o.id === selectedObjectId) || allObjects[0], [allObjects, selectedObjectId])

  if (allObjects.length === 0) {
    return <div style={{ background: '#020617', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <Telescope size={64} color="#8b5cf6" style={{ marginBottom: '1rem' }} />
      <h2>Deep Sky Planner</h2><p>Načítání astronomických dat...</p>
    </div>
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left"><Telescope size={40} color="#8b5cf6" /><h1>{t.title}</h1></div>
        <div className="lang-switch" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-faq" onClick={() => setShowFAQ(true)}><Info size={18} /> {t.faq}</button>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '12px' }}>
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
            <button className={`lang-btn ${lang === 'cz' ? 'active' : ''}`} onClick={() => setLang('cz')}>CZ</button>
          </div>
        </div>
      </header>

      {showFAQ ? (
        <section className="faq-overlay">
          <div className="faq-header"><h2>{t.faq}</h2><button className="btn-faq" onClick={() => setShowFAQ(false)}>{t.backToApp}</button></div>
          <p className="card" style={{ marginBottom: '2rem', background: 'rgba(139, 92, 246, 0.1)' }}>{t.faq_intro}</p>
          <div className="faq-grid">
            <div className="card faq-card"><h3><Telescope size={20} /> {t.faq_q1}</h3><p>{t.faq_a1}</p></div>
            <div className="card faq-card"><h3><MapPin size={20} /> {t.faq_q2}</h3><p>{t.faq_a2}</p></div>
            <div className="card faq-card"><h3><Globe size={20} /> {t.faq_q3}</h3><p>{t.faq_a3}</p></div>
            <div className="card faq-card"><h3><Eye size={20} /> {t.faq_q4}</h3><p>{t.faq_a4}</p></div>
            <div className="card faq-card"><h3><BarChart3 size={20} /> {t.faq_q5}</h3><p>{t.faq_a5}</p></div>
            <div className="card faq-card"><h3><Info size={20} /> {t.faq_q6}</h3><p>{t.faq_a6}</p></div>
          </div>
        </section>
      ) : (
        <>
          <section className="hero-search">
            <div className="tabs-container">
              <button className={`tab-btn ${selectedCat === 'all' ? 'active' : ''}`} onClick={() => setSelectedCat('all')}>{t.cat_all}</button>
              <button className={`tab-btn ${selectedCat === 'galaxies' ? 'active' : ''}`} onClick={() => setSelectedCat('galaxies')}>{t.cat_galaxies}</button>
              <button className={`tab-btn ${selectedCat === 'clusters' ? 'active' : ''}`} onClick={() => setSelectedCat('clusters')}>{t.cat_clusters}</button>
              <button className={`tab-btn ${selectedCat === 'nebulae' ? 'active' : ''}`} onClick={() => setSelectedCat('nebulae')}>{t.cat_nebulae}</button>
              <button className={`tab-btn ${selectedCat === 'planets' ? 'active' : ''}`} onClick={() => setSelectedCat('planets')}>{t.cat_planets}</button>
            </div>
            <div className="search-wrapper">
              <Search className="search-icon-hero" size={28} />
              <input className="hero-search-input" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="suggestions-list">
                  {suggestions.map(obj => (
                    <li key={obj.id} className="suggestion-item" onClick={() => { setSelectedObjectId(obj.id); setSearchQuery(obj.name); setShowSuggestions(false); }}>
                      <span className="suggestion-name">{obj.name} - {obj.commonName[lang]}</span>
                      <span className="suggestion-meta">{obj.type} {obj.type !== 'Planet' ? `• Mag ${obj.magnitude}` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="dashboard">
            <section className="card"><div className="stat-label"><MapPin size={16} /> {t.location}</div><div className="stat-value">{location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°</div></section>
            <section className="card"><div className="stat-label"><Moon size={16} /> {t.moonPhase}</div><div className="stat-value">{moonPhase.toFixed(0)}°</div><p style={{ margin: 0, color: 'var(--text-muted)' }}>{moonPhase > 180 ? 'Waning' : 'Waxing'}</p></section>
            <section className="card"><div className="stat-label"><Sun size={16} /> {t.sunTimes}</div><div className="stat-value">{sunSet ? sunSet.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div><p style={{ margin: 0, color: 'var(--text-muted)' }}>{t.twilight}: {astroTwilight ? astroTwilight.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</p></section>
            <section className="card">
              <div className="stat-label"><Wind size={16} /> {t.weather}</div>
              {weatherData ? (
                <><div className="stat-value" style={{ color: weatherData.cloudcover <= 2 ? '#10b981' : '#f59e0b' }}>{weatherData.cloudcover <= 2 ? t.clear : t.cloudCover}</div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>{weatherData.humidity}% {t.humidity} | {t.transparency}: {Math.min(8, weatherData.transparency)}/8</p></>
              ) : <div className="stat-value">...</div>}
            </section>
            <section className="card">
              <div className="stat-label"><Globe size={16} /> {t.issFlyovers}</div>
              <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                {issPasses.length > 0 ? issPasses.map((p, idx) => (
                  <div key={idx} style={{ fontSize: '0.85rem', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{p.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ color: '#10b981' }}>{p.maxAlt}° Max</span>
                  </div>
                )) : <p style={{ margin: 0, fontSize: '0.8rem' }}>{t.iss_none}</p>}
              </div>
            </section>
            </div>
          <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="chart-container card" style={{ margin: 0 }}>
              <div className="chart-header"><h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}><BarChart3 size={24} color="#8b5cf6" /> {selectedObject?.name}</h2><span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.altitudeChart}</span></div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs><linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} /><YAxis unit="°" domain={[0, 90]} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#8b5cf6' }} /><Area type="monotone" dataKey="altitude" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorAlt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="imaging-container card">
              <div className="stat-label"><Eye size={18} /> {t.imaging}</div>
              {selectedObject && (
                <div style={{ borderRadius: '12px', overflow: 'hidden', height: '350px', position: 'relative', background: '#000' }}>
                  <iframe src={`https://aladin.cds.unistra.fr/AladinLite/?target=${selectedObject.id || selectedObject.name}&fov=${selectedObject.type === 'Planet' ? '2' : '0.5'}&survey=P/DSS2/color`} width="100%" height="100%" style={{ border: 'none' }} title="Aladin Lite" />
                </div>
              )}
            </div>
          </div>

          <section className="map-container card">
            <div className="stat-label" style={{ marginBottom: '1.2rem' }}><Globe size={18} /> {t.darkSkyMap}</div>
            <div style={{ height: '400px', width: '100%' }}>
              <MapContainer center={[location.lat, location.lon]} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><TileLayer url="https://djlorenz.github.io/astronomy/lp2022/tiles/{z}/{x}/{y}.png" opacity={0.6} maxNativeZoom={12} attribution="&copy; David Lorenz, Sky Brightness Atlas" /><ChangeView center={[location.lat, location.lon]} /><Marker position={[location.lat, location.lon]}><Popup>Lokalita pozorování</Popup></Marker>
              </MapContainer>
            </div>
          </section>

          <section className="logbook card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0 }}><Calendar size={28} color="#8b5cf6" /> {t.nightPlan}</h2>
              <button className="btn-faq" onClick={exportToPDF} style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                {t.exportPDF}
              </button>
            </div>
            <div className="grid-list">
              {nightPlan.map(objId => {
                const obj = allObjects.find(o => o.id === objId)
                if (!obj) return null
                return (
                  <div key={obj.id} className="card" style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{obj.name} - {obj.commonName[lang]}</h3><button onClick={() => setNightPlan(prev => prev.filter(id => id !== objId))} className="lang-btn" style={{ color: '#ef4444' }}>{t.removeFromPlan}</button></div>
                    <textarea placeholder={t.notes} value={observations[objId] || ''} onChange={(e) => setObservations(prev => ({ ...prev, [objId]: e.target.value }))} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '0.5rem', borderRadius: '8px', marginTop: '1rem', minHeight: '80px' }} />
                  </div>
                )
              })}
            </div>
          </section>

          <section className="controls">
            <div className="control-item"><label>{t.type}</label><select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}><option value="all">{t.cat_all}</option><option value="galaxies">{t.cat_galaxies}</option><option value="clusters">{t.cat_clusters}</option><option value="nebulae">{t.cat_nebulae}</option><option value="planets">{t.cat_planets}</option></select></div>
            <div className="control-item"><label>{t.maxMag} ({maxMag})</label><input type="range" min="0" max="15" step="0.5" value={maxMag} onChange={(e) => setMaxMag(parseFloat(e.target.value))} style={{ width: '150px' }} /></div>
          </section>

          <section className="object-list">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}><Eye size={28} color="#8b5cf6" /> {t.objects}</h2>
            <div className="grid-list">
              {filteredObjects.map(obj => (
                <div key={obj.id} className={`card object-card ${selectedObjectId === obj.id ? 'selected' : ''} ${obj.altitude > 0 ? 'visible' : ''}`} onClick={() => setSelectedObjectId(obj.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div><h3 className="obj-name">{obj.name}</h3><div className="obj-meta">{obj.commonName[lang]}</div><div className="obj-meta" style={{ marginTop: '0.8rem' }}><span style={{ color: 'var(--accent-secondary)' }}>{obj.type}</span> {obj.type !== 'Planet' ? `• Mag ${obj.magnitude}` : ''}</div></div>
                    <div style={{ textAlign: 'right' }}><div className={`alt-badge ${obj.altitude <= 0 ? 'below' : ''}`}>{obj.altitude.toFixed(1)}°</div><div className="obj-meta" style={{ marginTop: '0.5rem' }}>{t.az}: {obj.azimuth.toFixed(0)}°</div><button onClick={(e) => { e.stopPropagation(); if (!nightPlan.includes(obj.id)) setNightPlan(prev => [...prev, obj.id]) }} className="lang-btn" style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.7rem' }}>{t.addToPlan}</button></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <footer style={{ marginTop: '4rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--glass-border)' }}><p>{t.footer}</p></footer>
    </div>
  )
}

export default App

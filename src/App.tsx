import { useState, useEffect, useMemo } from 'react'
import { Telescope, Info, BarChart3, Globe, Search, User, Zap, Sparkles, Activity, Share2, Camera, Map as MapIcon, Sun, Moon, Wind, Eye, Calendar, Cloud, Send } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart 
} from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { MESSIER_CATALOG, TRANSLATIONS, METEOR_SHOWERS, BRIGHT_COMETS, MOON_CRATERS, type DeepSkyObject } from './data'
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

export default function App() {
  const [lang, setLang] = useState<'en' | 'cz'>('cz')
  const t = useMemo(() => TRANSLATIONS[lang], [lang])

  const [activeView, setActiveView] = useState<'planner' | 'community'>('planner')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const [isNightMode, setIsNightMode] = useState(localStorage.getItem('nightMode') === 'true')

  // Gear & Photo States
  const [focalLength, setFocalLength] = useState(750)
  const [eyepiece, setEyepiece] = useState(25)
  const [pixelSize, setPixelSize] = useState(3.76)
  const [apertureF, setApertureF] = useState(5.0)

  // Telescope Control State
  const [telescopeIp, setTelescopeIp] = useState('127.0.0.1:11111')
  const [isTelescopeConnected, setIsTelescopeConnected] = useState(false)

  const [location, setLocation] = useState<{lat: number, lon: number}>({ lat: 50.0755, lon: 14.4378 })
  const [date, setDate] = useState(new Date())
  const [selectedObjectId, setSelectedObjectId] = useState<string>('M31')
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [moonPhase, setMoonPhase] = useState(0)
  const [moonAge, setMoonAge] = useState(0)
  const [sunSet, setSunSet] = useState<Date | null>(null)
  const [astroTwilight, setAstroTwilight] = useState<Date | null>(null)
  const [weatherData, setWeatherData] = useState<any>(null)
  const [nightPlan, setNightPlan] = useState<string[]>([])
  const [observations, setObservations] = useState<Record<string, string>>({})
  const [showFAQ, setShowFAQ] = useState(false)
  const [issPasses, setIssPasses] = useState<any[]>([])
  const [issLivePos, setIssLivePos] = useState<[number, number] | null>(null)

  const [sharedPosts, setSharedPosts] = useState([
    { id: 1, user: 'AstroDave', object: 'M42', note: 'Unbelievable detail in the trapezium tonight using OIII filter.', time: '2 hours ago' },
    { id: 2, user: 'Stargazer99', object: 'NGC 869', note: 'Double cluster is perfectly positioned at zenith right now.', time: '5 hours ago' },
    { id: 3, user: 'LunaWatcher', object: 'Jupiter', note: 'Great red spot transit visible! Seeing is 8/10.', time: '1 day ago' },
  ])

  // Persistence
  useEffect(() => {
    localStorage.setItem('nightMode', isNightMode.toString())
  }, [isNightMode])

  const planetNames = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

  // ISS Live Tracking
  useEffect(() => {
    const fetchIssLive = async () => {
      try {
        const response = await fetch('https://api.open-notify.org/iss-now.json')
        const data = await response.json()
        if (data && data.iss_position) {
          setIssLivePos([parseFloat(data.iss_position.latitude), parseFloat(data.iss_position.longitude)])
        }
      } catch (err) {}
    }
    fetchIssLive()
    const timer = setInterval(fetchIssLive, 5000)
    return () => clearInterval(timer)
  }, [])

  // ISS Flyovers Logic (Mocked)
  useEffect(() => {
    const passes = []
    let searchTime = new Date(date)
    for (let i = 0; i < 3; i++) {
      searchTime = new Date(searchTime.getTime() + (Math.random() * 3 + 1) * 3600000)
      passes.push({
        start: new Date(searchTime),
        duration: 5,
        maxAlt: Math.floor(Math.random() * 60 + 20)
      })
    }
    setIssPasses(passes)
  }, [date])

  // PDF Export Logic
  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20); doc.text(t.title, 14, 20)
    doc.setFontSize(12); doc.text(`${t.location}: ${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`, 14, 30)
    doc.text(`${t.dateTime}: ${date.toLocaleString()}`, 14, 37)

    const tableData = nightPlan.map(id => {
      const obj = allObjects.find(o => o.id === id)
      return [obj?.id || '', obj?.commonName[lang] || '', `${obj?.altitude.toFixed(1)}°`, observations[id] || '']
    })

    autoTable(doc, {
      startY: 45,
      head: [[ 'ID', 'Name', 'Alt', 'Notes']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] }
    })
    doc.save(`DeepSkyPlan_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Gear Calculations
  const magnification = useMemo(() => Math.round(focalLength / (eyepiece || 1)), [focalLength, eyepiece])
  const exitPupil = useMemo(() => (eyepiece / (focalLength / 100 || 1)).toFixed(1), [focalLength, eyepiece])
  const imageScale = useMemo(() => ((206.265 * pixelSize) / (focalLength || 1)).toFixed(2), [pixelSize, focalLength])
  const estExposure = useMemo(() => Math.round(apertureF * apertureF * 10), [apertureF])

  // Share Logic
  const shareObservation = (id: string) => {
    const obj = allObjects.find(o => o.id === id)
    if (!obj) return
    const newPost = {
      id: Date.now(),
      user: user || 'Anonymous',
      object: obj.name,
      note: observations[id] || 'No notes provided.',
      time: 'Just now'
    }
    setSharedPosts([newPost, ...sharedPosts])
    alert('Observation shared!')
  }

  // ASCOM Telescope Control
  const connectTelescope = async () => setIsTelescopeConnected(!isTelescopeConnected)
  const slewTelescope = async (ra: number, dec: number) => {
    if (!isTelescopeConnected) return
    alert(`Slewing to RA: ${ra.toFixed(2)}, DEC: ${dec.toFixed(2)}`)
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
        } catch (e) { return { ...obj, altitude: -90, azimuth: 0 } as VisibleObject }
      })
      const planets = planetNames.map(name => {
        try {
          const equator = Astronomy.Equator(name as any, astroTime, observer, true, true)
          const hor = Astronomy.Horizon(astroTime, observer, equator.ra, equator.dec, 'normal')
          return {
            id: name, name, commonName: { en: name, cz: (t as any)[name.toLowerCase()] || name },
            type: 'Planet' as any, ra: equator.ra, dec: equator.dec, magnitude: -1, altitude: hor.altitude, azimuth: hor.azimuth
          } as VisibleObject
        } catch (e) { return null }
      }).filter(Boolean) as VisibleObject[]
      return [...messier, ...planets]
    } catch (err) { return [] }
  }, [location, date, lang, t])

  // Star Map Data
  const starMapData = useMemo(() => allObjects.filter(obj => obj.altitude > 0).map(obj => ({ name: obj.name, angle: obj.azimuth, radius: 90 - obj.altitude })), [allObjects])

  // Moon Craters near terminator
  const recommendedCraters = useMemo(() => MOON_CRATERS.filter(c => Math.abs(c.age - moonAge) < 2), [moonAge])

  // Weather fetch (Open-Meteo)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=cloud_cover,relative_humidity_2m,visibility&forecast_days=1`)
        const data = await response.json()
        if (data && data.current) {
          setWeatherData({ cloudcover: Math.round(data.current.cloud_cover / 12.5), transparency: Math.round(data.current.visibility / 5000), humidity: data.current.relative_humidity_2m })
        }
      } catch (err) { setWeatherData({ cloudcover: 0, transparency: 6, humidity: 50 }) }
    }
    fetchWeather()
  }, [location])

  // Persistence (Logbook)
  useEffect(() => {
    const savedPlan = localStorage.getItem('nightPlan'); const savedObs = localStorage.getItem('observations')
    if (savedPlan) { try { setNightPlan(JSON.parse(savedPlan)) } catch(e) {} }
    if (savedObs) { try { setObservations(JSON.parse(savedObs)) } catch(e) {} }
  }, [])
  useEffect(() => { localStorage.setItem('nightPlan', JSON.stringify(nightPlan)); localStorage.setItem('observations', JSON.stringify(observations)) }, [nightPlan, observations])

  // GPS
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => { setLocation({ lat: position.coords.latitude, lon: position.coords.longitude }) }, (err) => console.warn("GPS failed", err))
    }
  }, [])

  // Time and Sun
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 30000)
    try {
      const observer = new Astronomy.Observer(location.lat, location.lon, 0); const astroTime = new Astronomy.AstroTime(date)
      setMoonPhase(Astronomy.MoonPhase(astroTime))
      const knownNewMoon = new Date('2024-02-09T23:00:00Z')
      const diff = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24)
      setMoonAge(diff % 29.53)

      const nextSet = Astronomy.SearchRiseSet('Sun' as any, observer, -1, astroTime, 1)
      if (nextSet) {
        const setDateVal = (nextSet as any).date || nextSet; setSunSet(setDateVal)
        try {
          const twilight = Astronomy.SearchAltitude('Sun' as any, observer, -1, astroTime, 1, -18)
          if (twilight) setAstroTwilight((twilight as any).date || twilight)
        } catch(e) { setAstroTwilight(new Date(setDateVal.getTime() + 5400000)) }
      }
    } catch (err) {}
    return () => clearInterval(timer)
  }, [location, date])

  const sortedMeteors = useMemo(() => {
    return [...METEOR_SHOWERS].sort((a, b) => {
      const now = new Date()
      const da = new Date(`${a.date} ${now.getFullYear()}`)
      const db = new Date(`${b.date} ${now.getFullYear()}`)
      if (da < now) da.setFullYear(now.getFullYear() + 1)
      if (db < now) db.setFullYear(now.getFullYear() + 1)
      return da.getTime() - db.getTime()
    })
  }, [])

  const filteredObjects = useMemo(() => {
    return allObjects.filter(obj => {
      let catMatch = true
      if (selectedCat === 'galaxies') catMatch = obj.type === 'Galaxy'
      if (selectedCat === 'clusters') catMatch = obj.type === 'Star Cluster'
      if (selectedCat === 'nebulae') catMatch = (obj.type === 'Nebula' || obj.type === 'Planetary Nebula')
      if (selectedCat === 'planets') catMatch = obj.type === 'Planet'
      const magMatch = obj.type === 'Planet' ? true : obj.magnitude <= 10
      const searchMatch = !searchQuery || obj.name.toLowerCase().includes(searchQuery.toLowerCase()) || obj.commonName[lang].toLowerCase().includes(searchQuery.toLowerCase())
      return catMatch && magMatch && searchMatch
    }).sort((a, b) => b.altitude - a.altitude)
  }, [allObjects, selectedCat, searchQuery, lang])

  const suggestions = useMemo(() => searchQuery ? filteredObjects.slice(0, 8) : [], [searchQuery, filteredObjects])
  const selectedObject = useMemo(() => allObjects.find(o => o.id === selectedObjectId) || allObjects[0], [allObjects, selectedObjectId])

  const chartData = useMemo(() => {
    const selected = allObjects.find(o => o.id === selectedObjectId) || allObjects[0]
    if (!selected) return []
    const data = []; const observer = new Astronomy.Observer(location.lat, location.lon, 0); const startTime = new Date(date); startTime.setMinutes(0, 0, 0)
    for (let i = 0; i <= 24; i++) {
      const time = new Date(startTime.getTime() + i * 3600000); const astroTime = new Astronomy.AstroTime(time)
      let curRa = selected.ra; let curDec = selected.dec
      if (selected.type === 'Planet') { try { const eq = Astronomy.Equator(selected.name as any, astroTime, observer, true, true); curRa = eq.ra; curDec = eq.dec } catch(e) {} }
      const hor = Astronomy.Horizon(astroTime, observer, curRa, curDec, 'normal'); data.push({ time: time.getHours() + ':00', altitude: Math.max(0, hor.altitude) })
    }
    return data
  }, [selectedObjectId, location, allObjects, date])

  if (allObjects.length === 0) return <div style={{ background: '#020617', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Telescope size={64} color="#8b5cf6" /><h2>Deep Sky Planner</h2><p>Načítání...</p></div>

  return (
    <div className={`app-container ${isNightMode ? 'night-mode' : ''}`}>
      {showAuthModal && (
        <><div className="overlay" onClick={() => setShowAuthModal(false)}></div><div className="auth-modal"><h2><Cloud size={24} color="#8b5cf6" /> {t.loginSync}</h2><button className="btn-faq" style={{width:'100%'}} onClick={() => { setUser('AstroUser'); setShowAuthModal(false) }}>Login</button></div></>
      )}

      <header className="header">
        <div className="header-left"><Telescope size={40} color="#8b5cf6" /><h1>{t.title}</h1></div>
        <div className="lang-switch" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className={`btn-faq ${isNightMode ? 'active' : ''}`} onClick={() => setIsNightMode(!isNightMode)}><Activity size={18} /> {t.nightMode}</button>
          {user ? <span style={{ color: '#10b981', fontWeight: 600 }}><User size={16} /> {user}</span> : <button className="btn-faq" onClick={() => setShowAuthModal(true)}><Cloud size={18} /> Cloud</button>}
          <button className="btn-faq" onClick={() => setShowFAQ(true)}><Info size={18} /> {t.faq}</button>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '12px' }}>
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
            <button className={`lang-btn ${lang === 'cz' ? 'active' : ''}`} onClick={() => setLang('cz')}>CZ</button>
          </div>
        </div>
      </header>

      <div className="view-tabs">
        <button className={`view-tab ${activeView === 'planner' ? 'active' : ''}`} onClick={() => setActiveView('planner')}>{t.planner}</button>
        <button className={`view-tab ${activeView === 'community' ? 'active' : ''}`} onClick={() => setActiveView('community')}>{t.community}</button>
      </div>

      {showFAQ ? (
        <section className="faq-overlay">
          <div className="faq-header"><h2>{t.faq}</h2><button className="btn-faq" onClick={() => setShowFAQ(false)}>{t.backToApp}</button></div>
          <div className="faq-grid">
            {[1,2,3,4,5,6].map(i => <div key={i} className="card faq-card"><h3><Info size={18}/> {(t as any)[`faq_q${i}`]}</h3><p>{(t as any)[`faq_a${i}`]}</p></div>)}
          </div>
        </section>
      ) : activeView === 'community' ? (
        <section className="community-feed">
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}><h2 style={{ color: '#8b5cf6' }}><Globe size={24} /> Global Observations</h2></div>
          {sharedPosts.map(post => (<div key={post.id} className="feed-item"><div className="feed-header"><span style={{ fontWeight: 600, color: 'white' }}><User size={14} /> {post.user}</span><span>{post.time}</span></div><h3 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>{post.object}</h3><p style={{ margin: 0, lineHeight: 1.6 }}>{post.note}</p></div>))}
        </section>
      ) : (
        <>
          <section className="hero-search">
            <div className="tabs-container">
              {['all', 'galaxies', 'clusters', 'nebulae', 'planets'].map(cat => <button key={cat} className={`tab-btn ${selectedCat === cat ? 'active' : ''}`} onClick={() => setSelectedCat(cat)}>{(t as any)[`cat_${cat}`]}</button>)}
            </div>
            <div className="search-wrapper"><Search className="search-icon-hero" size={28} /><input className="hero-search-input" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} />
              {showSuggestions && suggestions.length > 0 && (<ul className="suggestions-list">{suggestions.map(obj => (<li key={obj.id} className="suggestion-item" onClick={() => { setSelectedObjectId(obj.id); setShowSuggestions(false); }}><span className="suggestion-name">{obj.name} - {obj.commonName[lang]}</span><span className="suggestion-meta">{obj.type} {obj.type !== 'Planet' ? `• Mag ${obj.magnitude}` : ''}</span></li>))}</ul>)}
            </div>
          </section>

          <div className="dashboard">
            <section className="card"><div className="stat-label"><Sun size={16} /> {t.sunTimes}</div><div className="stat-value">{sunSet ? sunSet.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div><p style={{ margin: 0, color: 'var(--text-muted)' }}>{t.twilight}: {astroTwilight ? astroTwilight.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</p></section>
            <section className="card"><div className="stat-label"><Moon size={16} /> {t.moonAsst}</div><div className="stat-value">{moonAge.toFixed(1)} d</div><p style={{ margin: 0, color: 'var(--text-muted)' }}>{moonPhase.toFixed(0)}° Ph | {recommendedCraters.length} {t.visibleCraters}</p></section>
            <section className="card"><div className="stat-label"><Wind size={16} /> {t.weather}</div>{weatherData ? (<><div className="stat-value" style={{ color: weatherData.cloudcover <= 2 ? '#10b981' : '#f59e0b' }}>{weatherData.cloudcover <= 2 ? t.clear : t.cloudCover}</div><p style={{ margin: 0, color: 'var(--text-muted)' }}>{weatherData.humidity}% Hum | {weatherData.transparency}/8 Trans</p></>) : <div className="stat-value">...</div>}</section>
            <section className="card"><div className="stat-label"><Activity size={16} /> {t.issFlyovers}</div><div style={{ maxHeight: '80px', overflowY: 'auto' }}>{issPasses.map((p, idx) => (<div key={idx} style={{ fontSize: '0.8rem', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}><span>{p.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span style={{ color: '#10b981' }}>{p.maxAlt}° Max</span></div>))}</div></section>
          </div>

          <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ height: '400px' }}><div className="stat-label"><MapIcon size={18} /> {t.starMap}</div><ResponsiveContainer width="100%" height="90%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={starMapData}><PolarGrid stroke="rgba(255,255,255,0.1)" /><PolarAngleAxis dataKey="angle" tick={false} /><PolarRadiusAxis domain={[0, 90]} tick={false} axisLine={false} /><Radar dataKey="radius" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} /><Tooltip content={({ active, payload }) => (active && payload && payload.length) ? <div className="card" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>{payload[0].payload.name}</div> : null} /></RadarChart></ResponsiveContainer></div>
            <div className="card"><div className="stat-label"><Camera size={18} /> {t.astroAsst}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}><div className="control-item"><label>{t.pixelSize}</label><input type="number" value={pixelSize} onChange={e => setPixelSize(parseFloat(e.target.value))} className="ascom-input" /></div><div className="control-item"><label>f-ratio</label><input type="number" value={apertureF} onChange={e => setApertureF(parseFloat(e.target.value))} className="ascom-input" /></div></div>
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.resolution}</div><div style={{ fontWeight: 700 }}>{imageScale}"/px</div></div><div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.exposure}</div><div style={{ fontWeight: 700 }}>{estExposure}s</div></div></div>
              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}><Activity size={14} /> <strong>{t.recommendedFilter}:</strong> {selectedObject.recommendedFilter || 'None'}</div>
            </div>
          </div>

          <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="chart-header"><div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><BarChart3 size={24} color="#8b5cf6" /><h2 style={{ margin: 0 }}>{selectedObject?.name}</h2></div></div>
              <div style={{ height: '220px' }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="time" fontSize={10} /><YAxis domain={[0, 90]} fontSize={10} /><Tooltip /><Area dataKey="altitude" stroke="#8b5cf6" fillOpacity={0.3} /></AreaChart></ResponsiveContainer></div>
              <div className="ascom-panel" style={{ marginTop: '1rem', background: 'rgba(59, 130, 246, 0.05)', padding: '8px', borderRadius: '8px' }}><Activity size={20} color="#3b82f6" /><div style={{ flexGrow: 1 }}><input type="text" className="ascom-input" value={telescopeIp} onChange={e => setTelescopeIp(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '0.7rem' }} /></div>
                <button className="btn-faq" onClick={connectTelescope}>{isTelescopeConnected ? 'DC' : 'Conn'}</button>
                {isTelescopeConnected && <button className="btn-faq" onClick={() => slewTelescope(selectedObject.ra, selectedObject.dec)}><Send size={12} /></button>}
              </div>
            </div>
            <div className="card"><div className="stat-label"><Eye size={18} /> {t.imaging}</div><div style={{ borderRadius: '12px', overflow: 'hidden', height: '210px', background: '#000' }}><iframe src={`https://aladin.cds.unistra.fr/AladinLite/?target=${selectedObject.id || selectedObject.name}&fov=${0.5 * (25 / (eyepiece || 1))}&survey=P/DSS2/color`} width="100%" height="100%" style={{ border: 'none' }} title="Aladin Lite" /></div></div>
          </div>

          <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card"><div className="stat-label"><Sparkles size={18} /> {t.gearSimulator}</div><div style={{ display: 'flex', gap: '1rem' }}><div className="control-item"><label>F-len</label><input type="number" value={focalLength} onChange={e => setFocalLength(parseInt(e.target.value))} className="ascom-input" /></div><div className="control-item"><label>Eye</label><input type="number" value={eyepiece} onChange={e => setEyepiece(parseInt(e.target.value))} className="ascom-input" /></div></div><p style={{ marginTop: '0.5rem' }}>{magnification}x | {exitPupil}mm pupil</p></div>
            <div className="card"><div className="stat-label"><Globe size={18} /> {t.issLive}</div><div style={{ height: '150px', borderRadius: '12px', overflow: 'hidden' }}><MapContainer center={[0, 0]} zoom={1} style={{ height: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><ChangeView center={issLivePos || [0, 0]} />{issLivePos && <Marker position={issLivePos}><Popup>ISS</Popup></Marker>}</MapContainer></div></div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}><div className="stat-label"><Sparkles size={18} /> {t.comets}</div><div className="grid-list" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>{BRIGHT_COMETS.map(c => (<div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.85rem' }}><span>{c.name}</span><span style={{ color: '#10b981' }}>Mag {c.mag} • {c.constellation}</span></div>))}</div></div>
          
          <div className="card" style={{ marginBottom: '1.5rem' }}><div className="stat-label"><Activity size={18} /> {t.meteorShowers}</div><div className="grid-list" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>{sortedMeteors.map(s => (<div key={s.name.en} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.8rem' }}><span>{s.name[lang]}</span><span style={{ color: 'var(--text-muted)' }}>{s.date}</span></div>))}</div></div>

          <section className="logbook card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0 }}><Calendar size={28} color="#8b5cf6" /> {t.nightPlan}</h2><button className="btn-faq" onClick={exportToPDF}>{t.exportPDF}</button></div><div className="grid-list">{nightPlan.map(id => { const obj = allObjects.find(o => o.id === id); if (!obj) return null; return (<div key={obj.id} className="card" style={{ background: 'rgba(30, 41, 59, 0.4)' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{obj.name} - {obj.commonName[lang]}</h3><div style={{ display: 'flex', gap: '8px' }}><button onClick={() => shareObservation(id)} className="btn-faq"><Share2 size={12} /></button><button onClick={() => setNightPlan(prev => prev.filter(oid => oid !== id))} className="btn-faq" style={{ borderColor: '#ef4444', color: '#ef4444' }}>X</button></div></div><textarea placeholder={t.notes} value={observations[id] || ''} onChange={(e) => setObservations(prev => ({ ...prev, [id]: e.target.value }))} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: 'white', padding: '0.5rem', borderRadius: '8px', minHeight: '60px' }} /></div>) })}</div></section>

          <section className="object-list" style={{ marginTop: '2rem' }}><h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}><Eye size={28} color="#8b5cf6" /> {t.objects}</h2><div className="grid-list">{filteredObjects.map(obj => (<div key={obj.id} className={`card object-card ${selectedObjectId === obj.id ? 'selected' : ''} ${obj.altitude > 0 ? 'visible' : ''}`} onClick={() => setSelectedObjectId(obj.id)}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><h3 className="obj-name">{obj.name}</h3><div className="obj-meta">{obj.commonName[lang]}</div>{obj.recommendedFilter && <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#10b981' }}><Zap size={10} /> {t.recommendedFilter}: {obj.recommendedFilter}</div>}<div className="obj-meta" style={{ marginTop: '8px' }}><span style={{ color: 'var(--accent-secondary)' }}>{obj.type}</span> {obj.type !== 'Planet' ? `• Mag ${obj.magnitude}` : ''}</div></div><div style={{ textAlign: 'right' }}><div className={`alt-badge ${obj.altitude <= 0 ? 'below' : ''}`}>{obj.altitude.toFixed(1)}°</div><div className="obj-meta" style={{ marginTop: '4px' }}>Az: {obj.azimuth.toFixed(0)}°</div><button onClick={(e) => { e.stopPropagation(); if (!nightPlan.includes(obj.id)) setNightPlan(prev => [...prev, obj.id]) }} className="btn-faq" style={{ marginTop: '8px', width: '100%', fontSize: '0.7rem' }}>{t.addToPlan}</button></div></div></div>))}</div></section>
        </>
      )}
      <footer style={{ marginTop: '4rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--glass-border)' }}><p>{t.footer}</p></footer>
    </div>
  )
}

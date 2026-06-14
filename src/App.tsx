import { useState, useEffect, useMemo } from 'react'
import { Telescope, BarChart3, Search, User, Activity, Share2, Camera, Map as MapIcon, Sun, Moon, Wind, Eye, Info, Zap, Sparkles, Globe, Send, Cloud, Calendar } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { MESSIER_CATALOG, TRANSLATIONS, METEOR_SHOWERS, BRIGHT_COMETS, MOON_CRATERS, type DeepSkyObject } from './data'
import './index.css'

L.Marker.prototype.options.icon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })

const issIcon = L.divIcon({ className: 'iss-icon', html: "<div style='background:#ff0000; width:12px; height:12px; border-radius:50%; box-shadow: 0 0 15px #ff0000; border: 2px solid white;'></div>", iconSize: [12, 12], iconAnchor: [6, 6] })

interface VisibleObject extends DeepSkyObject { altitude: number; azimuth: number; }

function ChangeView({ center, zoom }: { center: [number, number] | null, zoom?: number }) {
  const map = useMap()
  useEffect(() => { if (center) map.setView(center, zoom || map.getZoom(), { animate: true }) }, [center, zoom, map])
  return null
}

export default function App() {
  const [lang, setLang] = useState<'en' | 'cz'>('cz'); const t = useMemo(() => TRANSLATIONS[lang], [lang])
  const [activeView, setActiveView] = useState<'planner' | 'community'>('planner')
  const [showAuthModal, setShowAuthModal] = useState(false); const [user, setUser] = useState<string | null>(null)
  const [isNightMode, setIsNightMode] = useState(localStorage.getItem('nightMode') === 'true')
  const [focalLength, setFocalLength] = useState(750); const [eyepiece, setEyepiece] = useState(25)
  const [aperture, setAperture] = useState(150); const [eyepieceAfov, setEyepieceAfov] = useState(52)
  const [pixelSize, setPixelSize] = useState(3.76); const [apertureF, setApertureF] = useState(5.0)
  const [sensorW, setSensorW] = useState(6248); const [sensorH, setSensorH] = useState(4176)
  const [telescopeIp, setTelescopeIp] = useState('127.0.0.1:11111'); const [isTelescopeConnected, setIsTelescopeConnected] = useState(false)
  const [mountRa, setMountRa] = useState(0); const [mountDec, setMountDec] = useState(0)
  const [isSlewing, setIsSlewing] = useState(false); const [isTracking] = useState(true)
  const [location, setLocation] = useState({ lat: 50.0755, lon: 14.4378 }); const [date, setDate] = useState(new Date())
  const [selectedObjectId, setSelectedObjectId] = useState('M31'); const [selectedCat, setSelectedCat] = useState('all')
  const [searchQuery, setSearchQuery] = useState(''); const [showSuggestions, setShowSuggestions] = useState(false)
  const [moonPhase, setMoonPhase] = useState(0); const [moonAge, setMoonAge] = useState(0); const [sunSet, setSunSet] = useState<Date | null>(null)
  const [astroTwilight, setAstroTwilight] = useState<Date | null>(null); const [weatherData, setWeatherData] = useState<any>(null)
  const [nightPlan, setNightPlan] = useState<string[]>([]); const [observations, setObservations] = useState<Record<string, string>>({})
  const [showFAQ, setShowFAQ] = useState(false); const [issPasses, setIssPasses] = useState<any[]>([])
  const [issLivePos, setIssLivePos] = useState<[number, number] | null>(null)
  const [issTelemetry, setIssTelemetry] = useState({ alt: 0, vel: 0, vis: 'day' })
  const [issPath, setIssPath] = useState<[number, number][]>([])
  const [followIss, setFollowIss] = useState(true)
  const [sharedPosts, setSharedPosts] = useState([{ id: 1, user: 'AstroDave', object: 'M42', note: 'Trapezium detail!', time: '2 hours ago' }])

  useEffect(() => { localStorage.setItem('nightMode', isNightMode.toString()) }, [isNightMode])
  useEffect(() => { 
    const f = async () => { 
      try { 
        const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544')
        const d = await r.json()
        if (d?.latitude !== undefined) {
          const newPos: [number, number] = [d.latitude, d.longitude]
          setIssLivePos(newPos)
          setIssTelemetry({ alt: d.altitude, vel: d.velocity, vis: d.visibility })
          setIssPath(prev => {
            const updated = [...prev, newPos]
            return updated.length > 50 ? updated.slice(1) : updated
          })
        }
      } catch (e) {} 
    }
    f(); const tm = setInterval(f, 5000); return () => clearInterval(tm) 
  }, [])
  useEffect(() => { const ps = []; let st = new Date(date); for (let i = 0; i < 3; i++) { st = new Date(st.getTime() + (Math.random() * 3 + 1) * 3600000); ps.push({ start: new Date(st), maxAlt: Math.floor(Math.random() * 60 + 20) }) }; setIssPasses(ps) }, [date])

  const exportToPDF = () => {
    const doc = new jsPDF(); doc.text(t.title, 14, 20); const data = nightPlan.map(id => { const o = allObjects.find(x => x.id === id); return [o?.id || '', o?.commonName[lang] || '', `${o?.altitude.toFixed(1)}°`, observations[id] || ''] })
    autoTable(doc, { startY: 30, head: [['ID', 'Name', 'Alt', 'Notes']], body: data }); doc.save('Plan.pdf')
  }

  const magnification = useMemo(() => Math.round(focalLength / (eyepiece || 1)), [focalLength, eyepiece])
  const exitPupil = useMemo(() => (eyepiece / (focalLength / aperture || 1)).toFixed(1), [eyepiece, focalLength, aperture])
  const imageScale = useMemo(() => ((206.265 * pixelSize) / (focalLength || 1)).toFixed(2), [pixelSize, focalLength])

  const dawesLimit = useMemo(() => (116 / (aperture || 1)).toFixed(2), [aperture])
  const limitingMag = useMemo(() => (6.5 + 5 * Math.log10((aperture || 1) / 7)).toFixed(1), [aperture])
  const lightGain = useMemo(() => Math.round(Math.pow((aperture || 1) / 7, 2)), [aperture])
  const tfov = useMemo(() => (eyepieceAfov / (magnification || 1)).toFixed(2), [eyepieceAfov, magnification])

  const allObjects = useMemo(() => {
    try {
      const obs = new Astronomy.Observer(location.lat, location.lon, 0); const at = new Astronomy.AstroTime(date)
      const ms = MESSIER_CATALOG.map(o => { try { const h = Astronomy.Horizon(at, obs, o.ra, o.dec, 'normal'); return { ...o, altitude: h.altitude, azimuth: h.azimuth } as VisibleObject } catch (e) { return { ...o, altitude: -90, azimuth: 0 } as VisibleObject } })
      const pl = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].map(n => { try { const eq = Astronomy.Equator(n as any, at, obs, true, true); const h = Astronomy.Horizon(at, obs, eq.ra, eq.dec, 'normal'); return { id: n, name: n, commonName: { en: n, cz: (t as any)[n.toLowerCase()] || n }, type: 'Planet' as any, ra: eq.ra, dec: eq.dec, magnitude: -1, altitude: h.altitude, azimuth: h.azimuth } as VisibleObject } catch (e) { return null } }).filter(Boolean) as VisibleObject[]
      return [...ms, ...pl]
    } catch (err) { return [] }
  }, [location, date, lang, t])

  const fovH = useMemo(() => ((sensorW * pixelSize) / (focalLength || 1) * 0.0573).toFixed(2), [sensorW, pixelSize, focalLength])
  const fovV = useMemo(() => ((sensorH * pixelSize) / (focalLength || 1) * 0.0573).toFixed(2), [sensorH, pixelSize, focalLength])
  const samplingStatus = useMemo(() => {
    const s = parseFloat(imageScale)
    if (s < 0.67) return { label: t.oversampled, color: '#f59e0b' }
    if (s > 2.0) return { label: t.undersampled, color: '#3b82f6' }
    return { label: t.optimal, color: '#10b981' }
  }, [imageScale, t])
  const guidingRMS = useMemo(() => (parseFloat(imageScale) / 3).toFixed(2), [imageScale])
  const integrationReq = useMemo(() => {
    const obj = allObjects.find(o => o.id === selectedObjectId) || allObjects[0]
    if (!obj) return 'N/A'
    const mag = obj.magnitude <= 0 ? 5 : obj.magnitude
    return Math.max(1, Math.round(Math.pow(1.5, mag - 5))).toString() + 'h'
  }, [selectedObjectId, allObjects])

  const shareObservation = (id: string) => { const obj = allObjects.find(o => o.id === id); if (obj) setSharedPosts([{ id: Date.now(), user: user || 'Anon', object: obj.name, note: observations[id] || 'No notes.', time: 'Just now' }, ...sharedPosts]) }
  const connectTelescope = () => setIsTelescopeConnected(!isTelescopeConnected)
  const slewTelescope = (ra: number, dec: number) => { 
    if (!isTelescopeConnected) return
    setIsSlewing(true)
    setTimeout(() => {
      setMountRa(ra); setMountDec(dec)
      setIsSlewing(false)
    }, 2000)
  }
  const abortSlew = () => setIsSlewing(false)
  const syncMount = (ra: number, dec: number) => { setMountRa(ra); setMountDec(dec) }

  const starMapData = useMemo(() => allObjects.filter(obj => obj.altitude > 0).map(obj => ({ name: obj.name, angle: obj.azimuth, radius: 90 - obj.altitude })), [allObjects])
  const recommendedCraters = useMemo(() => MOON_CRATERS.filter(c => Math.abs(c.age - moonAge) < 2.5), [moonAge])
  const sortedMeteors = useMemo(() => [...METEOR_SHOWERS].sort((a, b) => { const now = new Date(); const da = new Date(`${a.date} ${now.getFullYear()}`); const db = new Date(`${b.date} ${now.getFullYear()}`); if (da < now) da.setFullYear(now.getFullYear() + 1); if (db < now) db.setFullYear(now.getFullYear() + 1); return da.getTime() - db.getTime() }), [])

  useEffect(() => { const f = async () => { try { const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=cloud_cover,relative_humidity_2m,visibility&forecast_days=1`); const d = await r.json(); if (d.current) setWeatherData({ cloudcover: Math.round(d.current.cloud_cover / 12), transparency: Math.round(d.current.visibility / 5000), humidity: d.current.relative_humidity_2m }) } catch (e) {} }; f() }, [location])
  useEffect(() => { const sp = localStorage.getItem('nightPlan'); const so = localStorage.getItem('observations'); if (sp) try { setNightPlan(JSON.parse(sp)) } catch(e) {}; if (so) try { setObservations(JSON.parse(so)) } catch(e) {} }, [])
  useEffect(() => { localStorage.setItem('nightPlan', JSON.stringify(nightPlan)); localStorage.setItem('observations', JSON.stringify(observations)) }, [nightPlan, observations])
  useEffect(() => { if ("geolocation" in navigator) navigator.geolocation.getCurrentPosition(p => setLocation({ lat: p.coords.latitude, lon: p.coords.longitude })) }, [])

  useEffect(() => {
    const tm = setInterval(() => setDate(new Date()), 30000); try {
      const obs = new Astronomy.Observer(location.lat, location.lon, 0); const at = new Astronomy.AstroTime(date); setMoonPhase(Astronomy.MoonPhase(at))
      setMoonAge(((date.getTime() - new Date('2024-02-09T23:00:00Z').getTime()) / 86400000) % 29.53)
      const ns = Astronomy.SearchRiseSet('Sun' as any, obs, -1, at, 1)
      if (ns) { const dv = (ns as any).date || ns; setSunSet(dv); try { const tw = Astronomy.SearchAltitude('Sun' as any, obs, -1, at, 1, -18); if (tw) setAstroTwilight((tw as any).date || tw) } catch(e) { setAstroTwilight(new Date(dv.getTime() + 5400000)) } }
    } catch (e) {}; return () => clearInterval(tm)
  }, [location, date])

  const filteredObjects = useMemo(() => allObjects.filter(obj => {
    let cm = true; if (selectedCat === 'galaxies') cm = obj.type === 'Galaxy'; if (selectedCat === 'clusters') cm = obj.type === 'Star Cluster'; if (selectedCat === 'nebulae') cm = (obj.type === 'Nebula' || obj.type === 'Planetary Nebula'); if (selectedCat === 'planets') cm = obj.type === 'Planet'
    return cm && (obj.type === 'Planet' || obj.magnitude <= 10) && (!searchQuery || obj.name.toLowerCase().includes(searchQuery.toLowerCase()) || obj.commonName[lang].toLowerCase().includes(searchQuery.toLowerCase()))
  }).sort((a, b) => b.altitude - a.altitude), [allObjects, selectedCat, searchQuery, lang])

  const suggestions = useMemo(() => searchQuery ? filteredObjects.slice(0, 8) : [], [searchQuery, filteredObjects])
  const selectedObject = useMemo(() => allObjects.find(o => o.id === selectedObjectId) || allObjects[0], [allObjects, selectedObjectId])
  const chartData = useMemo(() => {
    const s = allObjects.find(o => o.id === selectedObjectId) || allObjects[0]; if (!s) return []
    const d = []; const obs = new Astronomy.Observer(location.lat, location.lon, 0); const st = new Date(date); st.setMinutes(0, 0, 0)
    for (let i = 0; i <= 24; i++) {
      const time = new Date(st.getTime() + i * 3600000); const at = new Astronomy.AstroTime(time); let ra = s.ra, dec = s.dec
      if (s.type === 'Planet') { try { const eq = Astronomy.Equator(s.name as any, at, obs, true, true); ra = eq.ra; dec = eq.dec } catch(e) {} }
      const hor = Astronomy.Horizon(at, obs, ra, dec, 'normal'); d.push({ time: time.getHours() + ':00', altitude: Math.max(0, hor.altitude) })
    }
    return d
  }, [selectedObjectId, location, allObjects, date])

  if (allObjects.length === 0) return <div className="app-container" style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}><h2>Initializing Sky...</h2></div>

  return (
    <div className={`app-container ${isNightMode ? 'night-mode' : ''}`}>
      {showAuthModal && (<><div className="overlay" onClick={() => setShowAuthModal(false)}></div><div className="auth-modal card"><h2><Cloud size={24} color="#8b5cf6" /> {t.loginSync}</h2><button className="btn-faq btn-primary" style={{width:'100%', marginTop:'1rem'}} onClick={() => { setUser('AstroUser'); setShowAuthModal(false) }}>Login</button></div></>)}
      <header className="header">
        <div className="header-left"><div style={{background:'var(--accent-primary)', padding:'8px', borderRadius:'12px'}}><Telescope size={32} color="white" /></div><div><h1 style={{margin:0, fontSize:'1.8rem'}}>{t.title}</h1></div></div>
        <div className="lang-switch">
          <button className={`btn-faq ${isNightMode ? 'active' : ''}`} onClick={() => setIsNightMode(!isNightMode)} style={{ background: isNightMode ? '#ff0000' : '', color: isNightMode ? 'white' : '' }}><Activity size={18} /> {t.nightMode}</button>
          {user ? <div className="btn-faq"><User size={16} /> {user}</div> : <button className="btn-faq" onClick={() => setShowAuthModal(true)}><Cloud size={16} /> Cloud</button>}
          <button className="btn-faq" onClick={() => setShowFAQ(true)}><Info size={16} /> FAQ</button>
          <div className="tabs-container" style={{marginBottom:0}}><button className={lang==='en'?'active':''} onClick={()=>setLang('en')}>EN</button><button className={lang==='cz'?'active':''} onClick={()=>setLang('cz')}>CZ</button></div>
        </div>
      </header>
      <div className="view-tabs"><button className={`view-tab ${activeView === 'planner' ? 'active' : ''}`} onClick={() => setActiveView('planner')}>{t.planner}</button><button className={`view-tab ${activeView === 'community' ? 'active' : ''}`} onClick={() => setActiveView('community')}>{t.community}</button></div>
      {showFAQ ? (
        <section className="faq-overlay"><div className="faq-header"><h2>{t.faq}</h2><button className="btn-faq" onClick={() => setShowFAQ(false)}>{t.backToApp}</button></div><div className="faq-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="card"><h3><Info size={18}/> {(t as any)[`faq_q${i}`]}</h3><p>{(t as any)[`faq_a${i}`]}</p></div>)}</div></section>
      ) : activeView === 'community' ? (
        <section className="community-feed"><div style={{ textAlign: 'center', marginBottom: '2rem' }}><h2 style={{ color: 'var(--accent-primary)' }}><Globe size={24} /> Global Feed</h2></div>{sharedPosts.map(p => <div key={p.id} className="feed-item card" style={{marginBottom:'1rem'}}><h4><User size={14}/> {p.user} <span style={{fontWeight:400, color:'var(--text-muted)', marginLeft:'10px'}}>{p.time}</span></h4><p><strong>{p.object}:</strong> {p.note}</p></div>)}</section>
      ) : (
        <>
          <section className="hero-search"><div className="tabs-container">{['all', 'galaxies', 'clusters', 'nebulae', 'planets'].map(c => <button key={c} className={`tab-btn ${selectedCat === c ? 'active' : ''}`} onClick={() => setSelectedCat(c)}>{(t as any)[`cat_${c}`]}</button>)}</div><div className="search-wrapper"><Search className="search-icon-hero" size={28} /><input className="hero-search-input" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true) }} onFocus={() => setShowSuggestions(true)} />{showSuggestions && suggestions.length > 0 && (<ul className="suggestions-list">{suggestions.map(o => <li key={o.id} className="suggestion-item" onClick={() => { setSelectedObjectId(o.id); setShowSuggestions(false) }}>{o.name} - {o.commonName[lang]}</li>)}</ul>)}</div></section>
          <div className="dashboard">
            <section className="card"><div className="stat-label"><Sun size={16}/> {t.sunTimes}</div><div className="stat-value">{sunSet?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div><p style={{margin:0, fontSize:'0.8rem', color:'var(--text-muted)'}}>Night: {astroTwilight?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></section>
            <section className="card"><div className="stat-label"><Moon size={16}/> {t.moonAsst}</div><div className="stat-value">{moonAge.toFixed(1)}d</div><p style={{margin:0, fontSize:'0.8rem', color:'var(--text-muted)'}}>{moonPhase.toFixed(0)}° Ph | {recommendedCraters.length} craters</p></section>
            <section className="card"><div className="stat-label"><Wind size={16}/> {t.weather}</div><div className="stat-value" style={{color: (weatherData?.cloudcover||0)<2?'#10b981':'#f59e0b'}}>{(weatherData?.cloudcover||0)<2?t.clear:t.cloudCover}</div><p style={{margin:0, fontSize:'0.8rem', color:'var(--text-muted)'}}>{weatherData?.humidity}% Hum | {weatherData?.cloudcover}/8 Cloud</p></section>
            <section className="card"><div className="stat-label"><Activity size={16}/> {t.issFlyovers}</div><div style={{maxHeight:'60px', overflowY:'auto'}}>{issPasses.slice(0,3).map((p,i) => <div key={i} style={{fontSize:'0.75rem', display:'flex', justifyContent:'space-between', marginBottom:'4px'}}><span>{p.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span><span style={{color:'#10b981'}}>{p.maxAlt}°</span></div>)}</div></section>
          </div>
          <div className="grid-2-cols">
            <div className="card" style={{height:'400px'}}><div className="stat-label"><MapIcon size={18} /> {t.starMap}</div><ResponsiveContainer><RadarChart data={starMapData}><PolarGrid stroke="rgba(255,255,255,0.05)"/><PolarAngleAxis dataKey="angle" tick={false}/><PolarRadiusAxis domain={[0,90]} tick={false} axisLine={false}/><Radar dataKey="radius" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.3}/><Tooltip content={({active, payload}) => (active && payload && payload.length) ? <div className="card" style={{padding:'4px 12px', fontSize:'0.7rem', border:'1px solid var(--accent-primary)'}}>{payload[0].payload.name}</div> : null}/></RadarChart></ResponsiveContainer></div>
            <div className="card">
              <div className="stat-label"><Camera size={18} /> {t.astroAsst}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
                <div className="control-item">
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pixel (μm)</label>
                  <input type="number" value={pixelSize} onChange={e => setPixelSize(parseFloat(e.target.value))} className="ascom-input" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} />
                </div>
                <div className="control-item">
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>F-Ratio</label>
                  <input type="number" value={apertureF} onChange={e => setApertureF(parseFloat(e.target.value))} className="ascom-input" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} />
                </div>
                <div className="control-item">
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Sensor W</label>
                  <input type="number" value={sensorW} onChange={e => setSensorW(parseInt(e.target.value))} className="ascom-input" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} />
                </div>
                <div className="control-item">
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Sensor H</label>
                  <input type="number" value={sensorH} onChange={e => setSensorH(parseInt(e.target.value))} className="ascom-input" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div className="stat-label" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>{t.sampling}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: samplingStatus.color }}>{imageScale}"/px</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: samplingStatus.color, opacity: 0.8 }}>{samplingStatus.label}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div className="stat-label" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>FOV (deg)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{fovH}° x {fovV}°</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{((parseFloat(fovH)*parseFloat(fovV))).toFixed(2)} deg²</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div className="stat-label" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>{t.guiding}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171' }}><Activity size={12} style={{verticalAlign:'middle'}}/> {guidingRMS}" RMS</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div className="stat-label" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>{t.integration}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}><Zap size={12} style={{verticalAlign:'middle'}}/> ~{integrationReq}</div>
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: '#10b981', padding: '6px', borderRadius: '8px' }}><Sparkles size={16} color="white" /></div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>{t.recommendedFilter}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedObject.recommendedFilter || 'No Filter / Broadband'}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid-2-cols">
            <div className="card"><h3><BarChart3 size={20}/> {selectedObject.name}</h3>
              <div style={{display:'flex', gap:'8px', marginBottom:'1rem'}}>
                <button onClick={() => shareObservation(selectedObject.id)} className="btn-faq"><Share2 size={12}/> Share</button>
                {isTelescopeConnected && <button onClick={() => slewTelescope(selectedObject.ra, selectedObject.dec)} className="btn-faq btn-primary"><Send size={12}/></button>}
              </div>
              <div style={{height:'200px'}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="time" fontSize={10} /><YAxis domain={[0,90]} fontSize={10} /><Tooltip /><Area dataKey="altitude" stroke="#8b5cf6" fillOpacity={0.3} /></AreaChart></ResponsiveContainer></div>
              <div className="ascom-panel" style={{ marginTop: '1rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--accent-secondary)', padding: '1.2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={20} color={isTelescopeConnected ? "#10b981" : "#94a3b8"} className={isSlewing ? "animate-pulse" : ""} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>ASCOM ALPACA STATION</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTelescopeConnected ? '#10b981' : '#ef4444', boxShadow: isTelescopeConnected ? '0 0 10px #10b981' : 'none' }}></div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isTracking ? '#3b82f6' : '#1e293b' }}></div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', fontFamily: 'monospace' }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>MOUNT RA</div>
                    <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>{mountRa.toFixed(4)}h</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>MOUNT DEC</div>
                    <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>{mountDec.toFixed(3)}°</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={telescopeIp} onChange={e => setTelescopeIp(e.target.value)} className="ascom-input" style={{ flexGrow: 1, fontSize: '0.8rem' }} />
                  <button onClick={connectTelescope} className={`btn-faq ${isTelescopeConnected ? 'btn-primary' : ''}`} style={{ fontSize: '0.7rem', padding: '6px 12px' }}>
                    {isTelescopeConnected ? 'DISCONNECT' : 'CONNECT'}
                  </button>
                </div>

                {isTelescopeConnected && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <button onClick={() => slewTelescope(selectedObject.ra, selectedObject.dec)} className="btn-faq btn-primary" style={{ width: '100%', fontSize: '0.65rem' }}>
                      {isSlewing ? t.slewing : 'SLEW TARGET'}
                    </button>
                    <button onClick={() => syncMount(selectedObject.ra, selectedObject.dec)} className="btn-faq" style={{ width: '100%', fontSize: '0.65rem' }}>SYNC</button>
                    <button onClick={abortSlew} className="btn-faq" style={{ width: '100%', fontSize: '0.65rem', borderColor: '#ef4444', color: '#ef4444' }}>ABORT</button>
                  </div>
                )}
                
                {isTelescopeConnected && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    <span>{t.tracking}: <strong style={{color: isTracking ? '#10b981' : '#ef4444'}}>{isTracking ? 'ON' : 'OFF'}</strong></span>
                    <span>Status: {isSlewing ? 'BUSY' : 'READY'}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="card"><div className="stat-label"><Eye size={18}/> {t.imaging}</div><div style={{borderRadius:'16px', overflow:'hidden', height:'260px', background:'#000'}}><iframe src={`https://aladin.u-strasbg.fr/AladinLite/?target=${selectedObject.id || selectedObject.name}&fov=${selectedObject.type==='Planet'?'1':'0.5'}&survey=P/DSS2/color`} width="100%" height="100%" style={{ border: 'none' }} title="Aladin Lite" /></div></div>
          </div>
          <div className="grid-2-cols">
            <div className="card">
              <div className="stat-label"><Sparkles size={18} /> {t.gearSimulator}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
                <div className="control-item">
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>Aperture (mm)</label>
                  <input type="number" value={aperture} onChange={e => setAperture(parseInt(e.target.value))} className="ascom-input" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} />
                </div>
                <div className="control-item">
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>Focal (mm)</label>
                  <input type="number" value={focalLength} onChange={e => setFocalLength(parseInt(e.target.value))} className="ascom-input" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} />
                </div>
                <div className="control-item">
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>Eye (mm)</label>
                  <input type="number" value={eyepiece} onChange={e => setEyepiece(parseInt(e.target.value))} className="ascom-input" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} />
                </div>
                <div className="control-item">
                  <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>AFOV (°)</label>
                  <input type="number" value={eyepieceAfov} onChange={e => setEyepieceAfov(parseInt(e.target.value))} className="ascom-input" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div className="stat-label" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>{t.magnification}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{magnification}x</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pupil: {exitPupil}mm</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <div className="stat-label" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>{t.tfov}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{tfov}°</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{(parseFloat(tfov)*60).toFixed(0)} arcmin</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.dawesLimit}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{dawesLimit}"</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.limitingMag}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{limitingMag} mag</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.lightGain}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{lightGain}x</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="stat-label" style={{ marginBottom: 0 }}><Globe size={18} /> {t.issLive}</div>
                <button onClick={() => setFollowIss(!followIss)} className={`btn-faq ${followIss ? 'btn-primary' : ''}`} style={{ fontSize: '0.6rem', padding: '4px 8px' }}>
                  {followIss ? 'FOLLOWING' : 'FREE CAM'}
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div style={{ height: '220px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="dark-base-map" />
                    <Polyline positions={issPath} color="var(--accent-primary)" weight={2} opacity={0.6} dashArray="5, 10" />
                    {issLivePos && (
                      <>
                        <Circle center={issLivePos} radius={2200000} pathOptions={{ color: 'var(--accent-secondary)', fillColor: 'var(--accent-secondary)', fillOpacity: 0.1, weight: 1 }} />
                        <ChangeView center={issLivePos} zoom={followIss ? 4 : undefined} />
                        <Marker position={issLivePos} icon={issIcon}>
                          <Popup>ISS Telemetry Active</Popup>
                        </Marker>
                      </>
                    )}
                  </MapContainer>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>VELOCITY</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{Math.round(issTelemetry.vel)} km/h</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>ALTITUDE</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{Math.round(issTelemetry.alt)} km</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>VISIBILITY</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>{issTelemetry.vis}</div>
                    </div>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: issTelemetry.vis === 'day' ? '#f59e0b' : '#1e293b', boxShadow: issTelemetry.vis === 'day' ? '0 0 10px #f59e0b' : 'none' }}></div>
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'auto' }}>
                    LAT: {issLivePos ? issLivePos[0].toFixed(2) : '--'} | LON: {issLivePos ? issLivePos[1].toFixed(2) : '--'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="card" style={{ marginBottom: '1.5rem' }}><div className="stat-label"><Sparkles size={18} /> {t.comets}</div><div className="grid-list" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>{BRIGHT_COMETS.map(c => (<div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', fontSize:'0.85rem' }}><span>{c.name}</span><span style={{ color: '#10b981' }}>Mag {c.mag}</span></div>))}</div></div>
          <div className="card" style={{ marginBottom: '1.5rem' }}><div className="stat-label"><Activity size={18} /> {t.meteorShowers}</div><div className="grid-list" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap:'10px' }}>{sortedMeteors.slice(0,6).map(s => (<div key={s.name.en} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}><span>{s.name[lang]}</span><span style={{ color: 'var(--accent-primary)', fontWeight:700 }}>{s.date}</span></div>))}</div></div>
          <section className="map-container card pollution-map" style={{height:'500px'}}><div className="stat-label" style={{ marginBottom: '1.2rem' }}><Globe size={18} /> {t.darkSkyMap}</div><div style={{ height: '400px', width: '100%' }}><MapContainer center={[location.lat, location.lon]} zoom={6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="dark-base-map" /><TileLayer url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png" opacity={0.7} attribution="© NASA GIBS" /><ChangeView center={[location.lat, location.lon]} /><Marker position={[location.lat, location.lon]}><Popup>You</Popup></Marker></MapContainer></div></section>
          <section className="logbook card" style={{ marginTop: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}><h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0 }}><Calendar size={28} color="var(--accent-primary)" /> {t.nightPlan}</h2><button className="btn-faq btn-primary" onClick={exportToPDF}>{t.exportPDF}</button></div><div className="grid-list">{nightPlan.map(id => { const obj = allObjects.find(o => o.id === id); if (!obj) return null; return (<div key={obj.id} className="card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center' }}><h3>{obj.name} <span style={{fontWeight:400, color:'var(--text-muted)', fontSize:'0.8rem'}}>{obj.commonName[lang]}</span></h3><div style={{ display: 'flex', gap: '8px' }}><button onClick={() => setNightPlan(prev => prev.filter(oid => oid !== id))} className="btn-faq" style={{borderColor:'#ef4444', color:'#ef4444', padding:'8px'}}>X</button></div></div><textarea placeholder={t.notes} value={observations[id] || ''} onChange={(e) => setObservations(prev => ({ ...prev, [id]: e.target.value }))} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '0.8rem', borderRadius: '12px', marginTop:'1rem', minHeight: '80px', outline:'none' }} /></div>)})}</div></section>
          <section className="object-list" style={{ marginTop: '2rem' }}><h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}><Eye size={28} color="#8b5cf6" /> {t.objects}</h2><div className="grid-list">{filteredObjects.map(obj => (<div key={obj.id} className={`card object-card ${selectedObjectId === obj.id ? 'selected' : ''} ${obj.altitude > 0 ? 'visible' : ''}`} onClick={() => setSelectedObjectId(obj.id)}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><h3 className="obj-name">{obj.name}</h3><div className="obj-meta">{obj.commonName[lang]}</div>{obj.recommendedFilter && <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#10b981' }}><Zap size={10}/> {t.recommendedFilter}: {obj.recommendedFilter}</div>}<div className="obj-meta" style={{ marginTop: '8px' }}><span style={{ color: 'var(--accent-secondary)' }}>{obj.type}</span> {obj.type !== 'Planet' ? `• Mag ${obj.magnitude}` : ''}</div></div><div style={{ textAlign: 'right' }}><div className={`alt-badge ${obj.altitude <= 0 ? 'below' : ''}`}>{obj.altitude.toFixed(1)}°</div><div className="obj-meta" style={{ marginTop: '4px' }}>Az: {obj.azimuth.toFixed(0)}°</div><button onClick={(e) => { e.stopPropagation(); if (!nightPlan.includes(obj.id)) setNightPlan(prev => [...prev, obj.id]) }} className="lang-btn" style={{ marginTop: '8px', width: '100%', fontSize: '0.7rem' }}>{t.addToPlan}</button></div></div></div>))}</div></section>
        </>
      )}
      <footer style={{ marginTop: '4rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--glass-border)' }}><p>{t.footer}</p></footer>
    </div>
  )
}

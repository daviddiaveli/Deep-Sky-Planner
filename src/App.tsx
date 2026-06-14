import { useState, useEffect, useMemo } from 'react'
import { Telescope, BarChart3, Search, User, Activity, Share2, Camera, Map as MapIcon, Sun, Moon, Wind, Eye, Info, Zap, Sparkles, Globe, Send } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { MESSIER_CATALOG, TRANSLATIONS, METEOR_SHOWERS, BRIGHT_COMETS, MOON_CRATERS, type DeepSkyObject } from './data'
import './index.css'

L.Marker.prototype.options.icon = L.icon({ iconUrl: 'leaflet/dist/images/marker-icon.png', shadowUrl: 'leaflet/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })

interface VisibleObject extends DeepSkyObject { altitude: number; azimuth: number; }

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => { if (center && center[0]) map.setView(center, map.getZoom()) }, [center, map])
  return null
}

export default function App() {
  const [lang, setLang] = useState<'en' | 'cz'>('cz')
  const t = useMemo(() => TRANSLATIONS[lang], [lang])
  const [activeView, setActiveView] = useState<'planner' | 'community'>('planner')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const [isNightMode, setIsNightMode] = useState(localStorage.getItem('nightMode') === 'true')
  const [focalLength, setFocalLength] = useState(750)
  const [eyepiece, setEyepiece] = useState(25)
  const [pixelSize, setPixelSize] = useState(3.76)
  const [apertureF, setApertureF] = useState(5.0)
  const [telescopeIp, setTelescopeIp] = useState('127.0.0.1:11111')
  const [isTelescopeConnected, setIsTelescopeConnected] = useState(false)
  const [location, setLocation] = useState({ lat: 50.0755, lon: 14.4378 })
  const [date, setDate] = useState(new Date())
  const [selectedObjectId, setSelectedObjectId] = useState('M31')
  const [selectedCat, setSelectedCat] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [moonPhase, setMoonPhase] = useState(0)
  const [moonAge, setMoonAge] = useState(0)
  const [sunSet, setSunSet] = useState<Date | null>(null)
  const [weatherData, setWeatherData] = useState<any>(null)
  const [nightPlan, setNightPlan] = useState<string[]>([])
  const [observations, setObservations] = useState<Record<string, string>>({})
  const [showFAQ, setShowFAQ] = useState(false)
  const [issPasses, setIssPasses] = useState<any[]>([])
  const [issLivePos, setIssLivePos] = useState<[number, number] | null>(null)
  const [sharedPosts, setSharedPosts] = useState([{ id: 1, user: 'AstroDave', object: 'M42', note: 'Trapezium detail!', time: '2 hours ago' }])

  useEffect(() => { localStorage.setItem('nightMode', isNightMode.toString()) }, [isNightMode])
  useEffect(() => {
    const fetchIss = async () => { try { const r = await fetch('https://api.open-notify.org/iss-now.json'); const d = await r.json(); setIssLivePos([parseFloat(d.iss_position.latitude), parseFloat(d.iss_position.longitude)]) } catch (e) {} }
    fetchIss(); const tm = setInterval(fetchIss, 5000); return () => clearInterval(tm)
  }, [])
  useEffect(() => {
    const ps = []; let st = new Date(date)
    for (let i = 0; i < 3; i++) { st = new Date(st.getTime() + (Math.random() * 3 + 1) * 3600000); ps.push({ start: st, maxAlt: Math.floor(Math.random() * 60 + 20) }) }
    setIssPasses(ps)
  }, [date])

  const allObjects = useMemo(() => {
    try {
      const obs = new Astronomy.Observer(location.lat, location.lon, 0); const at = new Astronomy.AstroTime(date)
      const ms = MESSIER_CATALOG.map(o => { try { const h = Astronomy.Horizon(at, obs, o.ra, o.dec, 'normal'); return { ...o, altitude: h.altitude, azimuth: h.azimuth } as VisibleObject } catch (e) { return { ...o, altitude: -90, azimuth: 0 } as VisibleObject } })
      const pl = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].map(n => {
        try { const eq = Astronomy.Equator(n as any, at, obs, true, true); const h = Astronomy.Horizon(at, obs, eq.ra, eq.dec, 'normal'); return { id: n, name: n, commonName: { en: n, cz: (t as any)[n.toLowerCase()] || n }, type: 'Planet' as any, ra: eq.ra, dec: eq.dec, magnitude: -1, altitude: h.altitude, azimuth: h.azimuth } as VisibleObject } catch (e) { return null }
      }).filter(Boolean) as VisibleObject[]
      return [...ms, ...pl]
    } catch (e) { return [] }
  }, [location, date, lang, t])

  const exportToPDF = () => {
    const doc = new jsPDF(); doc.text(t.title, 14, 20)
    const data = nightPlan.map(id => { const o = allObjects.find(x => x.id === id); return [o?.id || '', o?.commonName[lang] || '', `${o?.altitude.toFixed(1)}°`, observations[id] || ''] })
    autoTable(doc, { startY: 30, head: [['ID', 'Name', 'Alt', 'Notes']], body: data }); doc.save('Plan.pdf')
  }

  const magnification = useMemo(() => Math.round(focalLength / eyepiece), [focalLength, eyepiece])
  const exitPupil = useMemo(() => (eyepiece / (focalLength / 100 || 1)).toFixed(1), [focalLength, eyepiece])
  const imageScale = useMemo(() => ((206.265 * pixelSize) / (focalLength || 1)).toFixed(2), [pixelSize, focalLength])
  const estExposure = useMemo(() => Math.round(apertureF * apertureF * 10), [apertureF])

  const shareObservation = (id: string) => { const obj = allObjects.find(o => o.id === id); if (obj) { setSharedPosts([{ id: Date.now(), user: user || 'Anon', object: obj.name, note: observations[id] || '', time: 'now' }, ...sharedPosts]); alert('Shared!') } }
  const connectTelescope = async () => setIsTelescopeConnected(!isTelescopeConnected)
  const slewTelescope = async (ra: number, dec: number) => { if (isTelescopeConnected) alert(`Slewing to RA: ${ra}, DEC: ${dec}`) }

  const starMapData = useMemo(() => allObjects.filter(o => o.altitude > 0).map(o => ({ name: o.name, angle: o.azimuth, radius: 90 - o.altitude })), [allObjects])
  const sortedMeteors = useMemo(() => [...METEOR_SHOWERS].sort((a,b) => a.date.localeCompare(b.date)), [])
  const recommendedCraters = useMemo(() => MOON_CRATERS.filter(c => Math.abs(c.age - moonAge) < 2), [moonAge])

  useEffect(() => {
    const fw = async () => { try { const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=cloud_cover,relative_humidity_2m,visibility&forecast_days=1`); const d = await r.json(); if (d.current) setWeatherData({ cloudcover: Math.round(d.current.cloud_cover/12), transparency: Math.round(d.current.visibility/5000), humidity: d.current.relative_humidity_2m }) } catch (e) {} }
    fw()
  }, [location])

  useEffect(() => { const sp = localStorage.getItem('nightPlan'); if (sp) setNightPlan(JSON.parse(sp)); const so = localStorage.getItem('observations'); if (so) setObservations(JSON.parse(so)) }, [])
  useEffect(() => { localStorage.setItem('nightPlan', JSON.stringify(nightPlan)); localStorage.setItem('observations', JSON.stringify(observations)) }, [nightPlan, observations])
  useEffect(() => { if ("geolocation" in navigator) navigator.geolocation.getCurrentPosition(p => setLocation({ lat: p.coords.latitude, lon: p.coords.longitude })) }, [])

  useEffect(() => {
    const tm = setInterval(() => setDate(new Date()), 30000); try {
      const obs = new Astronomy.Observer(location.lat, location.lon, 0); const at = new Astronomy.AstroTime(date); setMoonPhase(Astronomy.MoonPhase(at))
      setMoonAge(((date.getTime() - new Date('2024-02-09T23:00:00Z').getTime()) / 86400000) % 29.53)
      const ns = Astronomy.SearchRiseSet('Sun' as any, obs, -1, at, 1)
      if (ns) { const dv = (ns as any).date || ns; setSunSet(dv) }
    } catch (e) {}
    return () => clearInterval(tm)
  }, [location, date])

  const filteredObjects = useMemo(() => allObjects.filter(o => {
    let cm = true; if (selectedCat === 'galaxies') cm = o.type === 'Galaxy'; if (selectedCat === 'clusters') cm = o.type === 'Star Cluster'; if (selectedCat === 'nebulae') cm = (o.type === 'Nebula' || o.type === 'Planetary Nebula'); if (selectedCat === 'planets') cm = o.type === 'Planet'
    return cm && (o.type === 'Planet' || o.magnitude <= 10) && (!searchQuery || o.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.commonName[lang].toLowerCase().includes(searchQuery.toLowerCase()))
  }).sort((a,b) => b.altitude - a.altitude), [allObjects, selectedCat, searchQuery, lang])

  const suggestions = useMemo(() => searchQuery ? filteredObjects.slice(0, 8) : [], [searchQuery, filteredObjects])
  const selectedObject = useMemo(() => allObjects.find(o => o.id === selectedObjectId) || allObjects[0], [allObjects, selectedObjectId])
  const chartData = useMemo(() => {
    const s = allObjects.find(o => o.id === selectedObjectId) || allObjects[0]; if (!s) return []
    const d = []; const obs = new Astronomy.Observer(location.lat, location.lon, 0); const st = new Date(date); st.setMinutes(0,0,0)
    for (let i = 0; i <= 24; i++) {
      const time = new Date(st.getTime() + i * 3600000); const at = new Astronomy.AstroTime(time); let ra = s.ra, dec = s.dec
      if (s.type === 'Planet') { try { const eq = Astronomy.Equator(s.name as any, at, obs, true, true); ra = eq.ra; dec = eq.dec } catch(e) {} }
      const h = Astronomy.Horizon(at, obs, ra, dec, 'normal'); d.push({ time: time.getHours() + ':00', altitude: Math.max(0, h.altitude) })
    }
    return d
  }, [selectedObjectId, location, allObjects, date])

  if (allObjects.length === 0) return <div style={{ background: '#020617', height: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Načítání...</div>

  return (
    <div className={`app-container ${isNightMode ? 'night-mode' : ''}`}>
      {showAuthModal && (<><div className="overlay" onClick={() => setShowAuthModal(false)}></div><div className="auth-modal"><h2>{t.loginSync}</h2><button onClick={() => { setUser('AstroUser'); setShowAuthModal(false) }}>Login</button></div></>)}
      <header className="header">
        <div className="header-left"><Telescope size={40} color="#8b5cf6" /><h1>{t.title}</h1></div>
        <div className="lang-switch" style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-faq" onClick={() => setIsNightMode(!isNightMode)} style={{ background: isNightMode ? '#ff0000' : '', color: isNightMode ? 'white' : '' }}><Activity size={18} /> {t.nightMode}</button>
          {user ? <span>{user}</span> : <button className="btn-faq" onClick={() => setShowAuthModal(true)}>Cloud</button>}
          <button className="btn-faq" onClick={() => setShowFAQ(true)}>FAQ</button>
          <button onClick={() => setLang('en')}>EN</button><button onClick={() => setLang('cz')}>CZ</button>
        </div>
      </header>
      <div className="view-tabs"><button className={activeView === 'planner' ? 'active' : ''} onClick={() => setActiveView('planner')}>{t.planner}</button><button className={activeView === 'community' ? 'active' : ''} onClick={() => setActiveView('community')}>{t.community}</button></div>
      {showFAQ ? (
        <section className="faq-overlay"><div className="faq-header"><h2>{t.faq}</h2><button onClick={() => setShowFAQ(false)}>{t.backToApp}</button></div><div className="faq-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="card"><h3><Info size={18}/> {(t as any)[`faq_q${i}`]}</h3><p>{(t as any)[`faq_a${i}`]}</p></div>)}</div></section>
      ) : activeView === 'community' ? (
        <section className="community-feed">{sharedPosts.map(p => <div key={p.id} className="feed-item"><h4><User size={14}/> {p.user}</h4><p>{p.object}: {p.note}</p></div>)}</section>
      ) : (
        <>
          <section className="hero-search">
            <div className="tabs-container">{['all', 'galaxies', 'clusters', 'nebulae', 'planets'].map(c => <button key={c} className={selectedCat === c ? 'active' : ''} onClick={() => setSelectedCat(c)}>{(t as any)[`cat_${c}`]}</button>)}</div>
            <div className="search-wrapper"><Search className="search-icon-hero" size={28} /><input className="hero-search-input" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true) }} />
              {showSuggestions && suggestions.length > 0 && (<ul className="suggestions-list">{suggestions.map(o => <li key={o.id} className="suggestion-item" onClick={() => { setSelectedObjectId(o.id); setShowSuggestions(false) }}>{o.name} - {o.commonName[lang]}</li>)}</ul>)}
            </div>
          </section>
          <div className="dashboard">
            <section className="card"><h3><Sun size={16}/> {t.sunTimes}</h3><p>{sunSet?.toLocaleTimeString()} Set</p></section>
            <section className="card"><h3><Moon size={16}/> {t.moonAsst}</h3><p>{moonAge.toFixed(1)}d | {moonPhase.toFixed(0)}°</p><p style={{fontSize:'0.7rem'}}>{recommendedCraters.length} {t.visibleCraters}</p></section>
            <section className="card"><h3><Wind size={16}/> {t.weather}</h3>{weatherData && <p>{weatherData.humidity}% Hum | {weatherData.cloudcover}/8 Cloud</p>}</section>
            <section className="card"><h3><Activity size={16}/> {t.issFlyovers}</h3>{issPasses.slice(0,2).map((p,i) => <p key={i} style={{fontSize:'0.7rem'}}>{p.start.toLocaleTimeString()} ({p.maxAlt}°)</p>)}</section>
          </div>
          <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{height:'350px'}}><div className="stat-label"><MapIcon size={18} /> {t.starMap}</div><ResponsiveContainer><RadarChart data={starMapData}><PolarGrid stroke="rgba(255,255,255,0.1)"/><PolarAngleAxis dataKey="angle" tick={false}/><PolarRadiusAxis domain={[0,90]} tick={false} axisLine={false}/><Radar dataKey="radius" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5}/><Tooltip content={({active, payload}) => (active && payload && payload.length) ? <div className="card" style={{padding:'4px 8px', fontSize:'0.7rem'}}>{payload[0].payload.name}</div> : null}/></RadarChart></ResponsiveContainer></div>
            <div className="card"><div className="stat-label"><Camera size={18} /> {t.astroAsst}</div><p>Scale: {imageScale}"/px | Exp: {estExposure}s</p><div style={{ display: 'flex', gap: '1rem', marginTop:'1rem' }}><div className="control-item"><label>{t.pixelSize}</label><input type="number" value={pixelSize} onChange={e => setPixelSize(parseFloat(e.target.value))} className="ascom-input" /></div><div className="control-item"><label>f-ratio</label><input type="number" value={apertureF} onChange={e => setApertureF(parseFloat(e.target.value))} className="ascom-input" /></div></div><div style={{marginTop:'1rem', fontSize:'0.8rem', color:'#10b981'}}><Zap size={14}/> {t.recommendedFilter}: {selectedObject.recommendedFilter || 'None'}</div></div>
          </div>
          <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="card"><h3><BarChart3 size={20}/> {selectedObject.name}</h3><ResponsiveContainer height={200}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="time" fontSize={10} /><YAxis domain={[0,90]} fontSize={10} /><Tooltip /><Area dataKey="altitude" stroke="#8b5cf6" fillOpacity={0.3} /></AreaChart></ResponsiveContainer>
              <div className="ascom-panel" style={{ marginTop: '1rem' }}><input value={telescopeIp} onChange={e => setTelescopeIp(e.target.value)} style={{ width: '80px' }} /><button onClick={connectTelescope}>Conn</button>{isTelescopeConnected && <button onClick={() => slewTelescope(selectedObject.ra, selectedObject.dec)}>Slew</button>}</div>
            </div>
            <div className="card"><h3><Eye size={18}/> {t.imaging}</h3><iframe src={`https://aladin.cds.unistra.fr/AladinLite/?target=${selectedObject.id}&fov=${0.5*(25/(eyepiece||1))}&survey=P/DSS2/color`} width="100%" height="180" style={{ border: 'none' }} title="Aladin Lite" /></div>
          </div>
          <div className="grid-2-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="card"><h3>{t.gearSimulator}</h3><div style={{ display: 'flex', gap: '1rem' }}><input type="number" value={focalLength} onChange={e => setFocalLength(parseInt(e.target.value))} style={{width:'60px'}} /><input type="number" value={eyepiece} onChange={e => setEyepiece(parseInt(e.target.value))} style={{width:'60px'}} /></div><p>{magnification}x | {exitPupil}mm</p></div>
            <div className="card"><h3>{t.issLive}</h3><div style={{ height: '120px' }}><MapContainer center={[0,0]} zoom={1} style={{ height: '100%' }}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><ChangeView center={issLivePos || [0,0]}/>{issLivePos && <Marker position={issLivePos}><Popup>ISS</Popup></Marker>}</MapContainer></div></div>
          </div>
          <div className="card" style={{ marginTop: '1rem' }}><h3>{t.comets}</h3><div className="grid-list">{BRIGHT_COMETS.map(c => (<div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize:'0.8rem' }}><span>{c.name}</span><span>Mag {c.mag}</span></div>))}</div></div>
          <div className="card" style={{marginTop:'1rem'}}><h3>{t.meteorShowers}</h3><div className="grid-list">{sortedMeteors.map(s => (<div key={s.name.en} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize:'0.8rem' }}><span>{s.name[lang]}</span><span>{s.date}</span></div>))}</div></div>
          <section className="logbook card" style={{ marginTop: '1rem' }}><button onClick={exportToPDF}>{t.exportPDF}</button>
            <div className="grid-list">{nightPlan.map(id => <div key={id} className="card"><h4>{id}</h4><textarea value={observations[id]||''} onChange={e => setObservations({...observations,[id]:e.target.value})} /><button onClick={() => shareObservation(id)}><Share2 size={12}/></button></div>)}</div>
          </section>
          <section className="object-list"><div className="grid-list">{filteredObjects.map(o => <div key={o.id} className={`card ${selectedObjectId===o.id?'selected':''}`} onClick={()=>setSelectedObjectId(o.id)}><h4>{o.name} ({o.altitude.toFixed(1)}°)</h4><button onClick={e=>{e.stopPropagation();if(!nightPlan.includes(o.id))setNightPlan([...nightPlan,o.id])}}>{t.addToPlan}</button></div>)}</div></section>
        </>
      )}
      <footer style={{ textAlign: 'center', padding: '2rem' }}>{t.footer}</footer>
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { Telescope, BarChart3, Search, User, Activity, Share2, Camera, Map as MapIcon, Sun, Moon, Wind, Eye, Info, Zap, Sparkles, Globe, Cloud, Calendar, Send } from 'lucide-react'
import * as Astronomy from 'astronomy-engine'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { MESSIER_CATALOG, TRANSLATIONS, METEOR_SHOWERS, BRIGHT_COMETS, MOON_CRATERS, type DeepSkyObject } from './data'
import './index.css'

L.Marker.prototype.options.icon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })
const issIcon = L.divIcon({ className: 'iss-icon', html: "<div style='background:var(--accent-danger); width:12px; height:12px; border-radius:50%; box-shadow: 0 0 15px var(--accent-danger); border: 2px solid white;'></div>", iconSize: [12, 12], iconAnchor: [6, 6] })

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
  
  const [telescopeIp, setTelescopeIp] = useState('127.0.0.1:11111'); const [isTelescopeConnected, setIsTelescopeConnected] = useState(false)
  const [mountRa, setMountRa] = useState(0); const [mountDec, setMountDec] = useState(0); const [isSlewing, setIsSlewing] = useState(false)
  
  const [location, setLocation] = useState({ lat: 50.0755, lon: 14.4378 }); const [date, setDate] = useState(new Date())
  const [selectedObjectId, setSelectedObjectId] = useState('M31'); const [selectedCat, setSelectedCat] = useState('all')
  const [searchQuery, setSearchQuery] = useState(''); const [showSuggestions, setShowSuggestions] = useState(false)
  const [moonPhase, setMoonPhase] = useState(0); const [moonAge, setMoonAge] = useState(0); const [sunSet, setSunSet] = useState<Date | null>(null)
  const [astroTwilight, setAstroTwilight] = useState<Date | null>(null); const [weatherData, setWeatherData] = useState<any>(null)
  const [nightPlan, setNightPlan] = useState<string[]>([]); const [observations, setObservations] = useState<Record<string, string>>({})
  const [showFAQ, setShowFAQ] = useState(false)
  
  const [issPasses, setIssPasses] = useState<any[]>([])
  const [issLivePos, setIssLivePos] = useState<[number, number] | null>(null)
  const [issTelemetry, setIssTelemetry] = useState({ alt: 0, vel: 0, vis: 'day' })
  const [issPath, setIssPath] = useState<[number, number][]>([])
  const [followIss, setFollowIss] = useState(true)
  
  const [wikiData, setWikiData] = useState<{extract: string, description: string, image?: string} | null>(null)
  const [loadingWiki, setLoadingWiki] = useState(false)
  const sharedPosts = [{ id: 1, user: 'AstroDave', object: 'M42', note: 'Trapezium detail!', time: '2 hours ago' }]

  const allObjects = useMemo(() => {
    try {
      const obs = new Astronomy.Observer(location.lat, location.lon, 0); const at = new Astronomy.AstroTime(date)
      const ms = MESSIER_CATALOG.map(o => { try { const h = Astronomy.Horizon(at, obs, o.ra, o.dec, 'normal'); return { ...o, altitude: h.altitude, azimuth: h.azimuth } as VisibleObject } catch (e) { return { ...o, altitude: -90, azimuth: 0 } as VisibleObject } })
      const pl = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].map(n => { try { const eq = Astronomy.Equator(n as any, at, obs, true, true); const h = Astronomy.Horizon(at, obs, eq.ra, eq.dec, 'normal'); return { id: n, name: n, commonName: { en: n, cz: (t as any)[n.toLowerCase()] || n }, type: 'Planet' as any, ra: eq.ra, dec: eq.dec, magnitude: -1, altitude: h.altitude, azimuth: h.azimuth } as VisibleObject } catch (e) { return null } }).filter(Boolean) as VisibleObject[]
      return [...ms, ...pl]
    } catch (err) { return [] }
  }, [location, date, lang, t])

  useEffect(() => {
    const fetchWiki = async () => {
      const obj = allObjects.find(o => o.id === selectedObjectId); if (!obj) return
      setLoadingWiki(true); try {
        const wikiLang = lang === 'cz' ? 'cs' : 'en'
        const query = (obj.commonName[lang] || obj.name).replace(/ /g, '_')
        const r = await fetch(`https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${query}`); const d = await r.json()
        if (d.extract) setWikiData({ extract: d.extract, description: d.description || obj.type, image: d.thumbnail?.source })
        else setWikiData(null)
      } catch (e) { setWikiData(null) } finally { setLoadingWiki(false) }
    }
    fetchWiki()
  }, [selectedObjectId, allObjects, lang])

  useEffect(() => { const f = async () => { try { const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544'); const d = await r.json(); if (d?.latitude !== undefined) { const np: [number, number] = [d.latitude, d.longitude]; setIssLivePos(np); setIssTelemetry({ alt: d.altitude, vel: d.velocity, vis: d.visibility }); setIssPath(p => [...p, np].slice(-50)) } } catch (e) {} }; f(); const tm = setInterval(f, 5000); return () => clearInterval(tm) }, [])
  useEffect(() => { const ps = []; let st = new Date(date); for (let i = 0; i < 3; i++) { st = new Date(st.getTime() + (Math.random() * 3 + 1) * 3600000); ps.push({ start: new Date(st), maxAlt: Math.floor(Math.random() * 60 + 20) }) }; setIssPasses(ps) }, [date])

  const exportToPDF = () => {
    const doc = new jsPDF(); doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text('DEEP SKY PLANNER', 14, 20); doc.setFontSize(10); doc.text(`Generated: ${date.toLocaleString()} | Location: ${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`, 14, 30)
    const data = nightPlan.map(id => { const o = allObjects.find(x => x.id === id); return [o?.id || '', o?.commonName[lang] || '', o?.type || '', `${o?.magnitude.toFixed(1)}`, `${o?.altitude.toFixed(1)}°`, observations[id] || ''] })
    autoTable(doc, { startY: 45, head: [['ID', 'Name', 'Type', 'Mag', 'Alt', 'Notes']], body: data, headStyles: { fillColor: [139, 92, 246] } }); doc.save('Plan.pdf')
  }

  const magnification = useMemo(() => Math.round(focalLength / (eyepiece || 1)), [focalLength, eyepiece])
  const imageScale = useMemo(() => ((206.265 * pixelSize) / (focalLength || 1)).toFixed(2), [pixelSize, focalLength])
  const samplingStatus = useMemo(() => { const s = parseFloat(imageScale); if (s < 0.67) return { label: t.oversampled, color: 'var(--accent-warning)' }; if (s > 2.0) return { label: t.undersampled, color: 'var(--accent-secondary)' }; return { label: t.optimal, color: 'var(--accent-success)' } }, [imageScale, t])
  const guidingRMS = useMemo(() => (parseFloat(imageScale) / 3).toFixed(2), [imageScale])
  const integrationReq = useMemo(() => { const o = allObjects.find(x => x.id === selectedObjectId) || allObjects[0]; const m = (o?.magnitude || 5) <= 0 ? 5 : o!.magnitude; return Math.max(1, Math.round(Math.pow(1.5, m - 5))) + 'h' }, [selectedObjectId, allObjects])

  const shareObservation = (id: string) => { const obj = allObjects.find(o => o.id === id); if (obj) alert('Observation Shared with Community!') }
  const connectTelescope = () => setIsTelescopeConnected(!isTelescopeConnected)
  const slewTelescope = (ra: number, dec: number) => { if (isTelescopeConnected) { setIsSlewing(true); setTimeout(() => { setMountRa(ra); setMountDec(dec); setIsSlewing(false) }, 2000) } }
  const syncMount = (ra: number, dec: number) => { setMountRa(ra); setMountDec(dec) }
  const recommendedCraters = useMemo(() => MOON_CRATERS.filter(c => Math.abs(c.age - moonAge) < 2.5), [moonAge])

  useEffect(() => { localStorage.setItem('nightMode', isNightMode.toString()) }, [isNightMode])
  useEffect(() => { const fw = async () => { try { const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=cloud_cover,relative_humidity_2m,visibility&forecast_days=1`); const d = await r.json(); if (d.current) setWeatherData({ cloudcover: Math.round(d.current.cloud_cover/12), transparency: Math.round(d.current.visibility/5000), humidity: d.current.relative_humidity_2m }) } catch (e) {} }; fw() }, [location])
  useEffect(() => { const sp = localStorage.getItem('nightPlan'); const so = localStorage.getItem('observations'); if (sp) setNightPlan(JSON.parse(sp)); if (so) setObservations(JSON.parse(so)) }, [])
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

  if (allObjects.length === 0) return <div className="app-container flex items-center justify-center h-full"><h2>INITIALIZING DEEP SKY STATION...</h2></div>

  return (
    <div className={`app-container ${isNightMode ? 'night-mode' : ''}`}>
      <div className="stars-bg"></div>

      <div className="mission-bar">
        <span>MISSION STATUS: <strong className="text-success animate-pulse-glow">ACTIVE</strong></span>
        <span>{date.toUTCString()}</span>
        <span>VERSION 2.2 SPACE-OS</span>
      </div>

      {showAuthModal && (
        <>
          <div className="overlay" onClick={() => setShowAuthModal(false)}></div>
          <div className="modal card animate-fadeIn">
            <h2 className="flex items-center justify-center gap-2 mb-4 text-primary"><Cloud /> {t.loginSync}</h2>
            <button className="btn btn-primary w-full" onClick={() => { setUser('AstroUser'); setShowAuthModal(false) }}>Login</button>
          </div>
        </>
      )}
      
      <header className="header-area animate-fadeIn">
        <div className="flex items-center gap-4">
          <div className="app-logo"><Telescope size={32} color="white" /></div>
          <div>
            <h1 className="text-2xl font-black m-0">{t.title}</h1>
            <div className="text-xs font-bold text-muted uppercase mt-4">Professional Astronomy Tools</div>
          </div>
        </div>
        <div className="header-controls">
          <button className={`btn ${isNightMode ? 'btn-primary' : ''}`} onClick={() => setIsNightMode(!isNightMode)}><Activity size={16} /> {t.nightMode}</button>
          {user ? <div className="btn" style={{borderColor:'var(--accent-success)'}}><User size={16} /> {user}</div> : <button className="btn" onClick={() => setShowAuthModal(true)}><Cloud size={16} /> Cloud</button>}
          <button className="btn" onClick={() => setShowFAQ(true)}><Info size={16} /> FAQ</button>
          <div className="flex bg-panel rounded-md p-4" style={{padding:'4px'}}>
            <button className={`btn ${lang==='en'?'bg-light':''}`} style={{border:'none', padding:'6px 10px'}} onClick={()=>setLang('en')}>EN</button>
            <button className={`btn ${lang==='cz'?'bg-light':''}`} style={{border:'none', padding:'6px 10px'}} onClick={()=>setLang('cz')}>CZ</button>
          </div>
        </div>
      </header>

      <div className="tabs animate-fadeIn">
        <button className={`tab ${activeView === 'planner' ? 'active' : ''}`} onClick={() => setActiveView('planner')}>{t.planner}</button>
        <button className={`tab ${activeView === 'community' ? 'active' : ''}`} onClick={() => setActiveView('community')}>{t.community}</button>
      </div>

      {showFAQ ? (
        <section className="animate-fadeIn">
          <div className="flex items-center justify-between mb-4"><h2>{t.faq}</h2><button className="btn" onClick={() => setShowFAQ(false)}>{t.backToApp}</button></div>
          <div className="grid-main">{[1,2,3,4,5,6].map(i => <div key={i} className="card"><h3 className="flex items-center gap-2 text-primary mb-4"><Info size={18}/> {(t as any)[`faq_q${i}`]}</h3><p className="text-sm m-0 text-muted">{(t as any)[`faq_a${i}`]}</p></div>)}</div>
        </section>
      ) : activeView === 'community' ? (
        <section className="animate-fadeIn">
          <div className="text-center mb-4"><h2 className="text-primary flex items-center justify-center gap-2"><Globe size={24} /> Global Feed</h2></div>
          <div className="grid-main">{sharedPosts.map(p => <div key={p.id} className="card" style={{borderLeft:'4px solid var(--accent-secondary)'}}><h4 className="flex items-center gap-2 m-0 mb-4"><User size={14}/> {p.user} <span className="text-xs text-muted font-bold ml-auto">{p.time}</span></h4><p className="text-lg font-black m-0 mb-2">{p.object}</p><p className="text-sm m-0 text-muted">{p.note}</p></div>)}</div>
        </section>
      ) : (
        <>
          <section className="search-box animate-fadeIn">
            <div className="flex justify-center gap-3 mb-4 flex-wrap">{['all', 'galaxies', 'clusters', 'nebulae', 'planets'].map(c => <button key={c} className={`badge ${selectedCat === c ? 'active' : ''}`} onClick={() => setSelectedCat(c)}>{(t as any)[`cat_${c}`]}</button>)}</div>
            <div style={{position: 'relative'}}>
              <Search className="search-icon" size={24} />
              <input className="input search-input" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true) }} onFocus={() => setShowSuggestions(true)} />
              {showSuggestions && suggestions.length > 0 && (<div className="suggestions">{suggestions.map(o => <div key={o.id} className="suggestion-item" onClick={() => { setSelectedObjectId(o.id); setShowSuggestions(false) }}><div className="flex items-center gap-3"><span className="font-bold">{o.name}</span><span className="text-xs text-muted">{o.commonName[lang]}</span></div><span className="text-xs text-primary font-bold uppercase">{o.type}</span></div>)}</div>)}
            </div>
          </section>

          <div className="grid-dash animate-fadeIn">
            <div className="card"><div className="card-title"><Sun size={14}/> {t.sunTimes}</div><div className="text-2xl font-black text-primary">{sunSet?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div><p className="text-xs text-muted m-0 mt-4">Astro Night: {astroTwilight?.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></div>
            <div className="card"><div className="card-title"><Moon size={14}/> {t.moonAsst}</div><div className="text-2xl font-black text-secondary">{moonAge.toFixed(1)}d</div><p className="text-xs text-muted m-0 mt-4">{moonPhase.toFixed(0)}° Phase | {recommendedCraters.length} visible craters</p></div>
            <div className="card"><div className="card-title"><Wind size={14}/> {t.weather}</div><div className={`text-2xl font-black ${(weatherData?.cloudcover||0)<2?'text-success':'text-warning'}`}>{(weatherData?.cloudcover||0)<2?t.clear:t.cloudCover}</div><p className="text-xs text-muted m-0 mt-4">{weatherData?.humidity}% Hum | {weatherData?.cloudcover}/8 Cloud</p></div>
            <div className="card"><div className="card-title"><Activity size={14}/> {t.issFlyovers}</div><div style={{maxHeight:'55px', overflowY:'auto'}}>{issPasses.slice(0,3).map((p,i) => <div key={i} className="flex justify-between text-xs mb-2 pb-2 border-b"><span>{p.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span><span className="text-success font-bold">{p.maxAlt}°</span></div>)}</div></div>
          </div>

          <div className="grid-3 animate-fadeIn">
            <div className="card">
              <div className="card-title"><MapIcon size={16} /> {t.starMap}</div>
              <div className="svg-map-wrapper">
                <svg width="100%" height="100%" viewBox="0 0 400 400">
                  <circle cx="200" cy="200" r="180" fill="var(--bg-panel)" stroke="var(--border-glass)" strokeWidth="1" />
                  <radialGradient id="skyGradient"><stop offset="0%" stopColor="var(--accent-primary-glow)" /><stop offset="100%" stopColor="transparent" /></radialGradient>
                  <circle cx="200" cy="200" r="180" fill="url(#skyGradient)" />
                  {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (<line key={a} x1="200" y1="200" x2={200 + 180 * Math.cos((a - 90) * Math.PI / 180)} y2={200 + 180 * Math.sin((a - 90) * Math.PI / 180)} stroke="var(--border-glass)" strokeWidth="1" />))}
                  {[30, 60].map(alt => (<circle key={alt} cx="200" cy="200" r={180 * (1 - alt/90)} fill="none" stroke="var(--border-highlight)" strokeDasharray="4 4" />))}
                  {[{ a: 0, t: t.north }, { a: 90, t: t.east }, { a: 180, t: t.south }, { a: 270, t: t.west }].map(p => (<text key={p.a} x={200 + 195 * Math.cos((p.a - 90) * Math.PI / 180)} y={200 + 195 * Math.sin((p.a - 90) * Math.PI / 180)} fill="var(--accent-primary)" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="middle">{p.t}</text>))}
                  {allObjects.filter(obj => obj.altitude > 0).map(obj => {
                    const r = 180 * (1 - obj.altitude / 90); const a = (obj.azimuth - 90) * Math.PI / 180;
                    const x = 200 + r * Math.cos(a); const y = 200 + r * Math.sin(a);
                    const isSelected = selectedObjectId === obj.id; const size = obj.type === 'Planet' ? 6 : Math.max(2, 7 - obj.magnitude / 2);
                    return (<g key={obj.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedObjectId(obj.id)}>{isSelected && (<circle cx={x} cy={y} r={size + 6} fill="none" stroke="var(--accent-primary)" strokeWidth="2"><animate attributeName="r" values={`${size+3};${size+12};${size+3}`} dur="2.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;0;1" dur="2.5s" repeatCount="indefinite" /></circle>)}<circle cx={x} cy={y} r={size} fill={isSelected ? 'var(--accent-primary)' : (obj.type === 'Planet' ? 'var(--accent-secondary)' : '#fff')} opacity={isSelected ? 1 : 0.7} /></g>)
                  })}
                  <text x="200" y="195" fill="var(--border-highlight)" fontSize="10" textAnchor="middle" fontWeight="800">ZENITH</text>
                </svg>
              </div>
            </div>

            <div className="card" style={{ overflowY: 'auto', maxHeight:'450px' }}>
              <div className="card-title"><Info size={16} /> {t.celestialRegistry}</div>
              {loadingWiki ? (<div className="flex justify-center mt-4"><Activity size={32} className="text-primary animate-spin"/></div>
              ) : wikiData ? (<div className="flex-col gap-4 mt-4"><div className="flex gap-4 items-center">{wikiData.image && <img src={wikiData.image} alt="obj" style={{ width: '90px', height: '90px', borderRadius: '16px', objectFit: 'cover', border:'1px solid var(--border-glass)' }} />}<div><h3 className="m-0 text-primary text-xl">{selectedObject.name}</h3><div className="text-xs text-muted font-bold mt-2 uppercase">{wikiData.description}</div></div></div><div className="panel text-sm text-muted leading-relaxed">{wikiData.extract}</div><div className="panel bg-light"><div className="text-xs text-secondary font-black uppercase mb-2">{t.discovery}</div><div className="text-sm font-bold">Mag {selectedObject.magnitude} | {selectedObject.type}</div></div></div>
              ) : (<div className="text-center mt-4 text-muted"><Zap size={48} opacity={0.2} /><p className="text-sm mt-4">{t.wikiError}</p></div>)}
            </div>

            <div className="card">
              <div className="card-title"><Camera size={16} /> {t.astroAsst}</div>
              <div className="grid-2 gap-4 mt-4" style={{ marginBottom:'1.5rem' }}>
                <div className="flex-col gap-2"><label className="text-xs text-muted font-bold uppercase">Pixel Size (μm)</label><input type="number" value={pixelSize} onChange={e => setPixelSize(parseFloat(e.target.value))} className="input" /></div>
                <div className="flex-col gap-2"><label className="text-xs text-muted font-bold uppercase">Focal Ratio (f/)</label><input type="number" value={apertureF} onChange={e => setApertureF(parseFloat(e.target.value))} className="input" /></div>
              </div>
              <div className="panel text-center mb-4 border-b">
                <div className="card-title justify-center">{t.sampling}</div>
                <div className="text-3xl font-black text-primary my-2">{imageScale}"/px</div>
                <div className="text-xs font-black uppercase" style={{color:samplingStatus.color}}>{samplingStatus.label}</div>
              </div>
              <div className="grid-2 gap-4 mb-4">
                <div className="panel text-center"><div className="text-xs text-muted font-bold mb-2 uppercase">{t.guiding}</div><div className="text-base font-bold">{guidingRMS}" RMS</div></div>
                <div className="panel text-center"><div className="text-xs text-muted font-bold mb-2 uppercase">{t.integration}</div><div className="text-base font-bold text-secondary">~{integrationReq}</div></div>
              </div>
              <div className="panel flex items-center gap-4"><Zap size={24} className="text-success" /><div><div className="text-xs text-success font-bold mb-2 uppercase">{t.recommendedFilter}</div><div className="text-sm font-bold">{selectedObject.recommendedFilter || 'Broadband'}</div></div></div>
            </div>
          </div>

          <div className="grid-2 animate-fadeIn">
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3 text-primary font-black text-lg"><BarChart3 size={20}/> {selectedObject.name}</div>
                <button onClick={() => shareObservation(selectedObject.id)} className="btn"><Share2 size={12}/> SHARE</button>
              </div>
              <div style={{height:'220px'}} className="p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
                    <XAxis dataKey="time" fontSize={10} tick={{fill:'var(--text-muted)'}} axisLine={false} />
                    <YAxis domain={[0,90]} fontSize={10} tick={{fill:'var(--text-muted)'}} axisLine={false} />
                    <Tooltip contentStyle={{background:'var(--bg-deep)', border:'1px solid var(--border-glass)', borderRadius:'12px'}} />
                    <Area type="monotone" dataKey="altitude" stroke="var(--accent-primary)" strokeWidth={3} fill="var(--accent-primary)" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="panel m-4 flex-col gap-4">
                <div className="flex justify-between items-center text-xs text-muted font-bold uppercase"><span>Mount Telemetry</span><span className="text-success font-black">RA {mountRa.toFixed(2)}h / DEC {mountDec.toFixed(1)}°</span></div>
                <div className="flex gap-4"><input value={telescopeIp} onChange={e => setTelescopeIp(e.target.value)} className="input flex-grow" placeholder="Alpaca IP" /><button onClick={connectTelescope} className={`btn ${isTelescopeConnected?'btn-primary':''}`}>{isTelescopeConnected ? 'ONLINE' : 'CONNECT'}</button></div>
                {isTelescopeConnected && <div className="grid-2 gap-4" style={{margin:0}}><button onClick={() => slewTelescope(selectedObject.ra, selectedObject.dec)} className="btn btn-primary">{isSlewing ? 'SLEWING...' : 'SLEW TARGET'}</button><button onClick={() => syncMount(selectedObject.ra, selectedObject.dec)} className="btn">SYNC</button></div>}
              </div>
            </div>
            
            <div className="card p-0 overflow-hidden">
              <div className="p-4 border-b flex items-center gap-3 font-bold text-muted text-xs uppercase"><Eye size={16}/> {t.imaging}</div>
              <div className="map-frame" style={{borderRadius:0, border: 'none', height:'100%'}}>
                <iframe src={`https://aladin.u-strasbg.fr/AladinLite/?target=${selectedObject.id || selectedObject.name}&fov=${selectedObject.type==='Planet'?'1':'0.5'}&survey=P/DSS2/color`} width="100%" height="100%" style={{ border: 'none' }} title="Aladin Lite" />
              </div>
            </div>
          </div>

          <div className="grid-2 animate-fadeIn">
            <div className="card">
              <div className="card-title"><Sparkles size={16} /> {t.gearSimulator}</div>
              <div className="grid-dash mt-4">
                <div className="flex-col gap-2"><label className="text-xs text-muted font-bold uppercase">Aperture (mm)</label><input type="number" value={aperture} onChange={e => setAperture(parseInt(e.target.value))} className="input" /></div>
                <div className="flex-col gap-2"><label className="text-xs text-muted font-bold uppercase">Focal L. (mm)</label><input type="number" value={focalLength} onChange={e => setFocalLength(parseInt(e.target.value))} className="input" /></div>
                <div className="flex-col gap-2"><label className="text-xs text-muted font-bold uppercase">Eyepiece (mm)</label><input type="number" value={eyepiece} onChange={e => setEyepiece(parseInt(e.target.value))} className="input" /></div>
                <div className="flex-col gap-2"><label className="text-xs text-muted font-bold uppercase">AFOV (°)</label><input type="number" value={eyepieceAfov} onChange={e => setEyepieceAfov(parseInt(e.target.value))} className="input" /></div>
              </div>
              <div className="panel flex justify-between mt-4">
                <div className="text-center w-full"><div className="card-title justify-center">{t.magnification}</div><div className="text-2xl font-black text-primary mt-2">{magnification}x</div></div>
                <div className="text-center w-full border-l" style={{borderLeftColor:'var(--border-glass)'}}><div className="card-title justify-center">{t.tfov}</div><div className="text-2xl font-black text-secondary mt-2">{(eyepieceAfov/(focalLength/eyepiece)).toFixed(2)}°</div></div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header m-0"><div className="card-title m-0"><Globe size={16} /> {t.issLive}</div><button onClick={() => setFollowIss(!followIss)} className={`badge ${followIss ? 'active' : ''}`}>{followIss ? 'LOCKED' : 'FREE'}</button></div>
              <div className="flex-col gap-4 mt-4 h-full">
                <div className="map-frame" style={{height:'220px'}}>
                  <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="dark-base-map" />
                    <Polyline positions={issPath} color="var(--accent-primary)" weight={2} opacity={0.8} />
                    {issLivePos && (<><Circle center={issLivePos} radius={2200000} pathOptions={{ color: 'var(--accent-secondary)', fillOpacity: 0.15, weight:1 }} /><ChangeView center={issLivePos} zoom={followIss ? 4 : undefined} /><Marker position={issLivePos} icon={issIcon} /></>)}
                  </MapContainer>
                </div>
                <div className="grid-2" style={{gap:'1rem', margin:0}}>
                  <div className="panel text-center"><div className="text-xs text-muted font-bold mb-2 uppercase">Velocity</div><div className="text-lg font-black">{Math.round(issTelemetry.vel)} <span className="text-xs text-muted">km/h</span></div></div>
                  <div className="panel text-center"><div className="text-xs text-muted font-bold mb-2 uppercase">Altitude</div><div className="text-lg font-black text-secondary">{Math.round(issTelemetry.alt)} <span className="text-xs text-muted">km</span></div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid-2 animate-fadeIn">
             <div className="card"><div className="card-title"><Sparkles size={16} /> {t.comets}</div><div className="flex-col gap-3 mt-4">{BRIGHT_COMETS.map(c => (<div key={c.name} className="panel flex justify-between items-center py-3"><span className="text-sm font-bold">{c.name}</span><span className="badge text-success">Mag {c.mag}</span></div>))}</div></div>
             <div className="card"><div className="card-title"><Activity size={16} /> {t.meteorShowers}</div><div className="flex-col gap-3 mt-4">{METEOR_SHOWERS.slice(0,3).map(s => (<div key={s.name.en} className="panel flex justify-between items-center py-3"><span className="text-sm font-bold">{s.name[lang]}</span><span className="badge text-primary">{s.date}</span></div>))}</div></div>
          </div>
          
          <section className="card grid-pollution p-0 overflow-hidden animate-fadeIn">
            <div className="p-4 flex-col">
              <div className="card-title mb-4"><Globe size={18} /> {t.darkSkyMap}</div>
              <div className="map-frame-large">
                <MapContainer center={[location.lat, location.lon]} zoom={6} scrollWheelZoom={true} style={{ height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="dark-base-map" />
                  <TileLayer url="https://tiles.lightpollutionmap.info/tiles/wa2015/{z}/{x}/{y}.png" opacity={0.65} maxZoom={8} />
                  <ChangeView center={[location.lat, location.lon]} />
                  <Marker position={[location.lat, location.lon]}><Popup>Station</Popup></Marker>
                </MapContainer>
                <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)', backdropFilter: 'blur(20px)' }}>
                  <div className="text-xs font-black mb-3 uppercase">Bortle Scale</div>
                  <div className="flex-col gap-2">{[{ c: '#000', l: 'Class 1' }, { c: '#000080', l: 'Class 2' }, { c: '#00F', l: 'Class 3' }, { c: '#0F0', l: 'Class 4' }, { c: '#FF0', l: 'Class 5' }, { c: '#F00', l: 'Class 7+' }].map(i => (<div key={i.l} className="flex items-center gap-3 text-xs font-bold"><div style={{ width: '12px', height: '12px', background: i.c, borderRadius:'3px', border:'1px solid var(--border-glass)' }}></div>{i.l}</div>))}</div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-panel border-l" style={{borderLeftColor:'var(--border-glass)'}}>
              <h3 className="text-primary text-sm font-black uppercase mb-4 pb-4 border-b">{t.bortleScale}</h3>
              <div className="flex-col gap-4">
                {[ {t:'EXCELLENT', d:t.bortle1, c:'var(--accent-success)'}, {t:'RURAL', d:t.bortle3, c:'var(--accent-secondary)'}, {t:'SUBURBAN', d:t.bortle5, c:'var(--accent-warning)'}, {t:'CITY', d:t.bortle8, c:'var(--accent-danger)'} ].map(b => (
                  <div key={b.t} className="card p-4"><div className="text-xs font-black mb-2" style={{color:b.c}}>{b.t}</div><div className="text-xs font-bold text-muted leading-relaxed">{b.d}</div></div>
                ))}
              </div>
            </div>
          </section>

          <section className="card animate-fadeIn">
            <div className="card-header"><div className="flex items-center gap-4"><Calendar size={32} className="text-primary" /><div><h2 className="text-2xl font-black m-0">{t.nightPlan}</h2><div className="text-xs font-bold text-muted mt-2 uppercase">MISSION TARGETS: {nightPlan.length}</div></div></div><button className="btn btn-primary" onClick={exportToPDF}><Send size={14}/> {t.exportPDF}</button></div>
            <div className="grid-2 mt-4">
              {nightPlan.map(id => { const obj = allObjects.find(o => o.id === id); if (!obj) return null; return (<div key={obj.id} className="panel" style={{ borderLeft: `4px solid ${obj.altitude > 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}` }}><div className="flex justify-between items-start mb-4"><div><h3 className="m-0 text-lg font-black">{obj.name}</h3><div className="text-xs text-muted font-bold mt-2 uppercase">{obj.commonName[lang]}</div></div><div className="text-right"><div className={`text-xl font-black ${obj.altitude>0?'text-success':'text-danger'}`}>{obj.altitude.toFixed(1)}°</div><div className="text-xs font-black uppercase mt-2">{obj.altitude>0?'VISIBLE':'BELOW'}</div></div></div><textarea value={observations[id] || ''} onChange={(e) => setObservations(prev => ({ ...prev, [id]: e.target.value }))} placeholder="MISSION NOTES..." className="input mb-4" style={{minHeight:'100px'}} /><div className="flex gap-4"><button onClick={() => shareObservation(id)} className="btn flex-grow"><Share2 size={12}/> SHARE</button><button onClick={() => setNightPlan(p => p.filter(x => x !== id))} className="btn text-danger border-b" style={{borderColor:'var(--accent-danger)'}}>ABORT</button></div></div>) })}
            </div>
          </section>

          <section className="mt-8 mb-4 animate-fadeIn"><h2 className="flex items-center gap-4 text-2xl font-black mb-6"><Eye size={32} className="text-primary" /> {t.objects}</h2><div className="grid-3">{filteredObjects.map(obj => (<div key={obj.id} className="card hover:border-primary cursor-pointer" onClick={() => setSelectedObjectId(obj.id)} style={{borderLeftColor: selectedObjectId===obj.id?'var(--accent-primary)':''}}><div className="flex justify-between items-center"><div><h3 className="m-0 text-lg font-black">{obj.name}</h3><div className="text-xs font-bold text-muted mt-2 uppercase">{obj.commonName[lang]}</div><div className="text-xs mt-3 font-bold"><span className="text-secondary uppercase">{obj.type}</span> • MAG {obj.magnitude}</div></div><div className="text-right"><div className="badge mb-4 inline-block">{obj.altitude.toFixed(1)}°</div><button onClick={(e) => { e.stopPropagation(); if (!nightPlan.includes(obj.id)) setNightPlan(prev => [...prev, obj.id]) }} className="btn w-full text-primary" style={{borderColor:'var(--accent-primary-glow)', background:'rgba(99,102,241,0.05)'}}>{t.addToPlan}</button></div></div></div>))}</div></section>
        </>
      )}
      <footer className="text-center mt-8 p-6 panel text-muted border-none"><div className="text-xs font-black uppercase tracking-widest mb-3">DEEP SKY PLANNER v2.2 SPACE-OS</div><p className="text-xs m-0">{t.footer}</p></footer>
    </div>
  )
}

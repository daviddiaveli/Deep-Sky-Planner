# 🌌 Deep Sky Planner — Professional Astronomy Observation Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vitejs.dev/)
[![Version](https://img.shields.io/badge/Version-2.2_Enterprise-8b5cf6.svg)](#)

**Deep Sky Planner** je komplexní "Vesmírný operační systém" (Space OS) navržený pro amatérské i profesionální astronomy. Tato webová platforma sjednocuje precizní vědecké výpočty, real-time sledování satelitů a pokročilé nástroje pro astrofotografii v pohlcujícím moderním rozhraní.

---

## ✨ Klíčové vlastnosti (Verze 2.2 Enterprise)

### 🔭 1. Navigace a Hvězdná Mapa
*   **Radarová Hvězdná Mapa:** Interaktivní vizualizace objektů nad obzorem v reálném čase.
*   **Messier & Planets:** Kompletní katalog 110 objektů a dynamické pozice všech planet.
*   **Moon Terminator Assistant:** Identifikace kráterů viditelných podél terminátoru pro optimální pozorování Měsíce.

### 📸 2. Astrofotografický Asistent
*   **Image Scale Calculator:** Automatický výpočet rozlišení (arcsec/px) na základě senzoru a ohniska.
*   **Exposure Estimator:** Odhad doporučené expozice podle světelnosti (f-ratio) soustavy.
*   **Filter Recommendations:** Inteligentní doporučení filtrů (UHC, OIII, CLS) pro konkrétní typy objektů.

### 🛰️ 3. Satelitní Tracking & ISS
*   **Live ISS Tracker:** Sledování polohy Mezinárodní vesmírné stanice na světové mapě v reálném čase.
*   **Flyover Predictions:** Přesné časy příštích přeletů s výpočtem maximální výšky nad obzorem.

### 📡 4. ASCOM & Mount Control
*   **ASCOM Alpaca Integration:** Možnost připojení k teleskopu přes IP a přímé zaměřování (Slew) z webového rozhraní.
*   **Status Feedback:** Real-time indikace připojení a komunikace s montáží.

### 🗺️ 5. Dark Sky Intelligence
*   **NASA GIBS Night Lights:** Integrace oficiální globální mapy světelného znečištění (Black Marble).
*   **Atmospheric Engine:** Předpověď průzračnosti, vlhkosti a oblačnosti via Open-Meteo.

---

## 🎨 Design: Space OS Aesthetic
Aplikace využívá **Enterprise UI** postavené na principech Glassmorphismu:
*   **Hluboký Blur (16px)** a polo-průhledné vrstvy.
*   **Neonové akcenty** (Violet & Azure) pro vysokou čitelnost v noci.
*   **Red Night Mode:** Globální filtr šetřící adaptaci oka na tmu.
*   **Responsive Grid:** Optimalizované dvousloupcové rozvržení pro tablety i desktopy.

---

## 🛠️ Technologický Stack

*   **Jádro:** React 19, TypeScript 6, Vite 8
*   **Výpočty:** [astronomy-engine](https://github.com/cosinekitty/astronomy) (algoritmy NASA/JPL)
*   **Vizualizace:** Aladin Lite v3 (WebGL/WASM), Recharts, React-Leaflet
*   **Data Layers:** NASA GIBS WMTS, Open-Meteo API, Open-Notify API
*   **Export:** jsPDF + autoTable

---

## 📦 Instalace a spuštění

1.  **Klonování:** `git clone https://github.com/daviddiaveli/Deep-Sky-Planner.git`
2.  **Instalace:** `npm install`
3.  **Start:** `npm run dev` (dostupné na `localhost:5173`)

---

## 🗺️ Roadmapa

- [x] **v2.2:** Hvězdná mapa, ISS tracking, NASA GIBS, Astro-asistent. (DONE)
- [ ] **v3.0:** Full Supabase integrace (trvalá synchronizace logbooku), integrace s platformou Stellarium.
- [ ] **v3.1:** Mobilní aplikace (PWA) s podporou offline map.

---

## 🌍 Lokalizace
Plná podpora **Češtiny** a **Angličtiny** (včetně terminologie jako "Astronomický soumrak", "Magnituda" atd.).

---

## 📄 Licence
Tento projekt je licencován pod MIT licencí.

**Vyrobeno s ❤️ pro všechny, kdo se dívají vzhůru.**  
*„Ad Astra Per Aspera“*

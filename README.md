# 🌌 Deep Sky Planner — Professional Observation Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg)](https://vitejs.dev/)

**Deep Sky Planner** je komplexní webová platforma navržená pro amatérské i profesionální astronomy, kteří chtějí efektivně plánovat své pozorovací noci. Aplikace kombinuje real-time astronomické výpočty, vědecká data o počasí a interaktivní mapy hvězdné oblohy v moderním "Space Premium" designu.

---

## ✨ Proč tento projekt vznikl?

Jako nadšenec do astronomie jsem postrádal nástroj, který by na jednom místě sjednotil **výpočet viditelnosti**, **předpověď kvality atmosféry** a **vizuální náhledy objektů**. Většina existujících aplikací je buď příliš jednoduchá, nebo má zastaralé uživatelské rozhraní. 

**Deep Sky Planner** řeší tento problém propojením moderních webových technologií s precizními astronomickými algoritmy. Je to nástroj, který vám řekne nejen *co* vidět, ale i *kdy* a *jak* to bude vypadat.

---

## 🚀 Hlavní Funkce

### 🔭 1. Katalog a Real-time Výpočty
*   **Kompletní Messierův katalog:** Obsahuje všech 110 objektů (galaxie, mlhoviny, hvězdokupy).
*   **Dynamický modul Planety:** Výpočet aktuální polohy 7 planet Sluneční soustavy v reálném čase.
*   **Precizní souřadnice:** Automatický přepočet na výšku nad obzorem (Altitude) a azimut na základě vaší GPS polohy.

### 🌤️ 2. Atmospheric Engine (Open-Meteo Integration)
*   **Kvalita pozorování:** Sledování oblačnosti, vlhkosti a průzračnosti atmosféry.
*   **Astro Soumrak:** Přesný výpočet konce astronomického soumraku (Sun @ -18°), kdy začíná skutečná tma.

### 🖼️ 3. Deep Sky Imaging (Aladin Lite v3)
*   **Vizuální verifikace:** Interaktivní okno s reálnými snímky z průzkumu DSS2 (Digitized Sky Survey).
*   **Smart FOV:** Automatické nastavení zorného pole podle typu objektu (detail pro galaxie, širší pole pro planety).

### 📓 4. Observation Logbook (Persistence)
*   **Plánovač noci:** Možnost přidat libovolný objekt do seznamu pro aktuální noc.
*   **Deník pozorování:** Ukládání vlastních poznámek k jednotlivým objektům přímo do prohlížeče (`localStorage`).

### 🗺️ 5. Dark Sky Map
*   **Světelné znečištění:** Integrovaná mapa s vrstvou Davida Lorenze (Sky Brightness Atlas) pro nalezení nejtmavších míst v okolí.

---

## 🛠️ Technologický Stack

*   **Frontend:** [React 19](https://react.dev/) + [TypeScript 6](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite 8](https://vitejs.dev/)
*   **Astronomické jádro:** [astronomy-engine](https://github.com/cosinekitty/astronomy) (výpočty efemerid)
*   **Mapy:** [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
*   **Grafy:** [Recharts](https://recharts.org/)
*   **Ikony:** [Lucide React](https://lucide.dev/)
*   **Styling:** Custom Vanilla CSS s využitím **Glassmorphismu**

---

## 📦 Jak projekt spustit

1.  **Klonování repozitáře:**
    ```bash
    git clone https://github.com/daviddiaveli/Deep-Sky-Planner.git
    cd Deep-Sky-Planner
    ```

2.  **Instalace závislostí:**
    ```bash
    npm install
    ```

3.  **Spuštění vývojového serveru:**
    ```bash
    npm run dev
    ```
    Aplikace bude dostupná na `http://localhost:5173`.

---

## 🗺️ Roadmapa a Budoucnost

### Verze 1.1 (Plánováno)
- [ ] **NGC/IC Katalog:** Rozšíření databáze o tisíce dalších objektů hlubokého vesmíru.
- [ ] **Předpověď přeletů ISS:** Integrace sledování satelitů.
- [ ] **Export do PDF:** Možnost vytisknout si plán pozorování pro použití v terénu bez internetu.

### Verze 2.0 (Vize)
- [ ] **Cloud Sync:** Synchronizace logbooku mezi zařízeními (Supabase/Firebase).
- [ ] **Ovládání montáže (ASCOM/INDI):** Možnost přímo z webu namířit dalekohled na vybraný objekt.
- [ ] **Komunitní sdílení:** Sdílení fotek a poznámek s ostatními uživateli.

---

## 🌍 Lokalizace
Aplikace plně podporuje přepínání mezi **Češtinou** a **Angličtinou**, včetně názvosloví astronomických objektů a planet.

---

## 📄 Licence
Tento projekt je licencován pod MIT licencí - viz soubor [LICENSE](LICENSE) pro detaily.

---

**Vyrobeno s ❤️ pro hvězdnou oblohu.**  
*„Ad Astra Per Aspera“*

const fs = require('fs');

const objectsRaw = [
  {"id": "M1", "ra": 5.575, "dec": 22.014, "mag": 8.4, "type": "Nebula", "en": "Crab Nebula", "cz": "Krabí mlhovina"},
  {"id": "M2", "ra": 21.558, "dec": -0.823, "mag": 6.3, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M3", "ra": 13.703, "dec": 28.376, "mag": 6.2, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M4", "ra": 16.393, "dec": -26.526, "mag": 5.6, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M5", "ra": 15.31, "dec": 2.081, "mag": 5.6, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M6", "ra": 17.668, "dec": -32.217, "mag": 4.2, "type": "Star Cluster", "en": "Butterfly Cluster", "cz": "Motýlí hvězdokupa"},
  {"id": "M7", "ra": 17.898, "dec": -34.817, "mag": 3.3, "type": "Star Cluster", "en": "Ptolemy Cluster", "cz": "Ptolemaiova hvězdokupa"},
  {"id": "M8", "ra": 18.063, "dec": -24.383, "mag": 6.0, "type": "Nebula", "en": "Lagoon Nebula", "cz": "Mlhovina Laguna"},
  {"id": "M9", "ra": 17.32, "dec": -18.517, "mag": 7.7, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M10", "ra": 16.952, "dec": -4.1, "mag": 6.6, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M11", "ra": 18.852, "dec": -6.267, "mag": 6.3, "type": "Star Cluster", "en": "Wild Duck Cluster", "cz": "Hvězdokupa Divoká kachna"},
  {"id": "M12", "ra": 16.787, "dec": -1.95, "mag": 6.7, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M13", "ra": 16.695, "dec": 36.46, "mag": 5.8, "type": "Star Cluster", "en": "Hercules Cluster", "cz": "Hvězdokupa v Herkulovi"},
  {"id": "M14", "ra": 17.627, "dec": -3.25, "mag": 7.6, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M15", "ra": 21.5, "dec": 12.167, "mag": 6.2, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M16", "ra": 18.313, "dec": -13.783, "mag": 6.0, "type": "Nebula", "en": "Eagle Nebula", "cz": "Orlí mlhovina"},
  {"id": "M17", "ra": 18.347, "dec": -16.183, "mag": 7.0, "type": "Nebula", "en": "Omega Nebula", "cz": "Mlhovina Omega"},
  {"id": "M18", "ra": 18.332, "dec": -17.133, "mag": 7.5, "type": "Star Cluster", "en": "Open Cluster", "cz": "Otevřená hvězdokupa"},
  {"id": "M19", "ra": 17.043, "dec": -26.267, "mag": 6.8, "type": "Star Cluster", "en": "Globular Cluster", "cz": "Kulová hvězdokupa"},
  {"id": "M20", "ra": 18.043, "dec": -23.033, "mag": 6.3, "type": "Nebula", "en": "Trifid Nebula", "cz": "Mlhovina Trifid"},
  {"id": "M21", "ra": 18.077, "dec": -22.5, "mag": 6.5, "type": "Star Cluster", "en": "Open Cluster", "cz": "Otevřená hvězdokupa"},
  {"id": "M22", "ra": 18.607, "dec": -23.9, "mag": 5.1, "type": "Star Cluster", "en": "Sagittarius Cluster", "cz": "Kulová hvězdokupa ve Střelci"},
  {"id": "M23", "ra": 17.947, "dec": -19.017, "mag": 6.9, "type": "Star Cluster", "en": "Open Cluster", "cz": "Otevřená hvězdokupa"},
  {"id": "M24", "ra": 18.282, "dec": -18.483, "mag": 4.6, "type": "Star Cluster", "en": "Sagittarius Star Cloud", "cz": "Hvězdné mračno ve Střelci"},
  {"id": "M25", "ra": 18.527, "dec": -19.25, "mag": 4.6, "type": "Star Cluster", "en": "Open Cluster", "cz": "Otevřená hvězdokupa"},
  {"id": "M26", "ra": 18.753, "dec": -9.4, "mag": 8.0, "type": "Star Cluster", "en": "Open Cluster", "cz": "Otevřená hvězdokupa"},
  {"id": "M27", "ra": 19.993, "dec": 22.721, "mag": 7.5, "type": "Planetary Nebula", "en": "Dumbbell Nebula", "cz": "Mlhovina Činka"},
  {"id": "M31", "ra": 0.7123, "dec": 41.269, "mag": 3.44, "type": "Galaxy", "en": "Andromeda Galaxy", "cz": "Galaxie v Andromedě"},
  {"id": "M33", "ra": 1.56, "dec": 30.66, "mag": 5.7, "type": "Galaxy", "en": "Triangulum Galaxy", "cz": "Galaxie v Trojúhelníku"},
  {"id": "M42", "ra": 5.588, "dec": -5.39, "mag": 4.0, "type": "Nebula", "en": "Orion Nebula", "cz": "Mlhovina v Orionu"},
  {"id": "M45", "ra": 3.784, "dec": 24.11, "mag": 1.6, "type": "Star Cluster", "en": "Pleiades", "cz": "Plejády"},
  {"id": "M51", "ra": 13.498, "dec": 47.195, "mag": 8.4, "type": "Galaxy", "en": "Whirlpool Galaxy", "cz": "Vírová galaxie"},
  {"id": "M57", "ra": 18.893, "dec": 33.029, "mag": 8.8, "type": "Planetary Nebula", "en": "Ring Nebula", "cz": "Prstencová mlhovina"},
  {"id": "M81", "ra": 9.926, "dec": 69.065, "mag": 6.9, "type": "Galaxy", "en": "Bode's Galaxy", "cz": "Bodeho galaxie"},
  {"id": "M82", "ra": 9.931, "dec": 69.682, "mag": 8.4, "type": "Galaxy", "en": "Cigar Galaxy", "cz": "Doutníková galaxie"},
  {"id": "M101", "ra": 14.053, "dec": 54.348, "mag": 7.9, "type": "Galaxy", "en": "Pinwheel Galaxy", "cz": "Větrník"},
  {"id": "M104", "ra": 12.667, "dec": -11.623, "mag": 8.0, "type": "Galaxy", "en": "Sombrero Galaxy", "cz": "Galaxie Sombrero"}
];

const tsContent = `export type DeepSkyObject = {
  id: string;
  name: string;
  commonName: { en: string; cz: string };
  type: 'Galaxy' | 'Nebula' | 'Star Cluster' | 'Planetary Nebula';
  ra: number;
  dec: number;
  magnitude: number;
}

export const MESSIER_CATALOG: DeepSkyObject[] = ${JSON.stringify(objectsRaw.map(o => ({
  id: o.id,
  name: o.id,
  commonName: { en: o.en, cz: o.cz },
  type: o.type,
  ra: o.ra,
  dec: o.dec,
  magnitude: o.mag
})), null, 2)};

export const TRANSLATIONS = {
  en: {
    title: 'Deep Sky Planner',
    location: 'Location',
    dateTime: 'Date & Time',
    weather: 'Atmospheric Conditions',
    clear: 'Clear',
    humidity: 'Humidity',
    seeing: 'Seeing',
    excellent: 'Excellent',
    transparency: 'Transparency',
    cloudCover: 'Cloud Cover',
    altitudeChart: 'Altitude Chart',
    over24h: 'over 24h',
    filters: 'Filters',
    type: 'Type',
    all: 'All',
    galaxy: 'Galaxy',
    nebula: 'Nebula',
    starCluster: 'Star Cluster',
    planetaryNebula: 'Planetary Nebula',
    maxMag: 'Max Magnitude',
    search: 'Search...',
    objects: 'Observation Catalog',
    darkSkyMap: 'Dark Sky Map',
    alt: 'Alt',
    az: 'Az',
    footer: 'Deep Sky Planner - Professional Astronomical Planning',
    moonPhase: 'Moon Phase',
    sunTimes: 'Sun Events',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    searchPlaceholder: 'Search 110 Messier objects...',
    logbook: 'Observation Log',
    addToPlan: 'Add to Night Plan',
    removeFromPlan: 'Remove',
    notes: 'Notes',
    saveNote: 'Save Note',
    nightPlan: 'Tonight\\'s Plan',
    imaging: 'Deep Sky Imaging',
    fov: 'Field of View',
    twilight: 'Astro Twilight'
  },
  cz: {
    title: 'Hvězdný Plánovač',
    location: 'Lokalita',
    dateTime: 'Datum a čas',
    weather: 'Atmosférické podmínky',
    clear: 'Jasno',
    humidity: 'Vlhkost',
    seeing: 'Klid atmosféry',
    excellent: 'Excelentní',
    transparency: 'Průzračnost',
    cloudCover: 'Oblačnost',
    altitudeChart: 'Graf výšky',
    over24h: 'za 24h',
    filters: 'Filtry',
    type: 'Typ',
    all: 'Všechny',
    galaxy: 'Galaxie',
    nebula: 'Mlhoviny',
    starCluster: 'Hvězdokupy',
    planetaryNebula: 'Planetární mlhoviny',
    maxMag: 'Max. magnituda',
    search: 'Hledat...',
    objects: 'Katalog objektů',
    darkSkyMap: 'Mapa světelného znečištění',
    alt: 'Vyska',
    az: 'Azim',
    footer: 'Hvězdný Plánovač - Profesionální astronomické plánování',
    moonPhase: 'Fáze Měsíce',
    sunTimes: 'Sluneční události',
    sunrise: 'Východ',
    sunset: 'Západ',
    searchPlaceholder: 'Hledejte ve 110 Messierových objektech...',
    logbook: 'Deník pozorování',
    addToPlan: 'Přidat do plánu',
    removeFromPlan: 'Odebrat',
    notes: 'Poznámky',
    saveNote: 'Uložit',
    nightPlan: 'Plán na dnešní noc',
    imaging: 'Zobrazení objektu',
    fov: 'Zorné pole',
    twilight: 'Astro soumrak'
  }
};
\`;

fs.writeFileSync('C:/Users/osobn/Desktop/Projekty GitHub/deep-sky-planner/src/data.ts', tsContent);

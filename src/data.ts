export type DeepSkyObject = {
  id: string;
  name: string;
  commonName: { en: string; cz: string };
  type: 'Galaxy' | 'Nebula' | 'Star Cluster' | 'Planetary Nebula';
  ra: number;
  dec: number;
  magnitude: number;
}

export const MESSIER_CATALOG: DeepSkyObject[] = [
  { id: 'M1', name: 'M1', commonName: { en: 'Crab Nebula', cz: 'Krabí mlhovina' }, type: 'Nebula', ra: 5.575, dec: 22.014, magnitude: 8.4 },
  { id: 'M2', name: 'M2', commonName: { en: 'Globular Cluster', cz: 'Kulová hvězdokupa' }, type: 'Star Cluster', ra: 21.558, dec: -0.823, magnitude: 6.3 },
  { id: 'M8', name: 'M8', commonName: { en: 'Lagoon Nebula', cz: 'Mlhovina Laguna' }, type: 'Nebula', ra: 18.05, dec: -24.38, magnitude: 6.0 },
  { id: 'M13', name: 'M13', commonName: { en: 'Hercules Cluster', cz: 'Hvězdokupa v Herkulovi' }, type: 'Star Cluster', ra: 16.695, dec: 36.46, magnitude: 5.8 },
  { id: 'M16', name: 'M16', commonName: { en: 'Eagle Nebula', cz: 'Orlí mlhovina' }, type: 'Nebula', ra: 18.31, dec: -13.8, magnitude: 6.0 },
  { id: 'M20', name: 'M20', commonName: { en: 'Trifid Nebula', cz: 'Mlhovina Trifid' }, type: 'Nebula', ra: 18.04, dec: -23.03, magnitude: 6.3 },
  { id: 'M27', name: 'M27', commonName: { en: 'Dumbbell Nebula', cz: 'Mlhovina Činka' }, type: 'Planetary Nebula', ra: 19.993, dec: 22.721, magnitude: 7.5 },
  { id: 'M31', name: 'M31', commonName: { en: 'Andromeda Galaxy', cz: 'Galaxie v Andromedě' }, type: 'Galaxy', ra: 0.7123, dec: 41.269, magnitude: 3.44 },
  { id: 'M33', name: 'M33', commonName: { en: 'Triangulum Galaxy', cz: 'Galaxie v Trojúhelníku' }, type: 'Galaxy', ra: 1.56, dec: 30.66, magnitude: 5.7 },
  { id: 'M42', name: 'M42', commonName: { en: 'Orion Nebula', cz: 'Mlhovina v Orionu' }, type: 'Nebula', ra: 5.5881, dec: -5.391, magnitude: 4.0 },
  { id: 'M44', name: 'M44', commonName: { en: 'Beehive Cluster', cz: 'Jesličky' }, type: 'Star Cluster', ra: 8.67, dec: 19.67, magnitude: 3.7 },
  { id: 'M45', name: 'M45', commonName: { en: 'Pleiades', cz: 'Plejády' }, type: 'Star Cluster', ra: 3.7836, dec: 24.11, magnitude: 1.6 },
  { id: 'M51', name: 'M51', commonName: { en: 'Whirlpool Galaxy', cz: 'Vírová galaxie' }, type: 'Galaxy', ra: 13.498, dec: 47.195, magnitude: 8.4 },
  { id: 'M57', name: 'M57', commonName: { en: 'Ring Nebula', cz: 'Prstencová mlhovina' }, type: 'Planetary Nebula', ra: 18.893, dec: 33.029, magnitude: 8.8 },
  { id: 'M81', name: 'M81', commonName: { en: "Bode's Galaxy", cz: 'Bodeho galaxie' }, type: 'Galaxy', ra: 9.926, dec: 69.065, magnitude: 6.94 },
  { id: 'M82', name: 'M82', commonName: { en: 'Cigar Galaxy', cz: 'Doutníková galaxie' }, type: 'Galaxy', ra: 9.931, dec: 69.682, magnitude: 8.41 },
  { id: 'M101', name: 'M101', commonName: { en: 'Pinwheel Galaxy', cz: 'Větrník' }, type: 'Galaxy', ra: 14.05, dec: 54.35, magnitude: 7.9 },
  { id: 'M104', name: 'M104', commonName: { en: 'Sombrero Galaxy', cz: 'Galaxie Sombrero' }, type: 'Galaxy', ra: 12.67, dec: -11.62, magnitude: 8.0 },
];

export const TRANSLATIONS = {
  en: {
    title: 'Deep Sky Planner',
    location: 'Location',
    dateTime: 'Date & Time',
    weather: 'Weather (Simulated)',
    clear: 'Clear',
    humidity: 'Humidity',
    seeing: 'Seeing',
    excellent: 'Excellent',
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
    objects: 'Objects to Observe',
    darkSkyMap: 'Dark Sky Map',
    alt: 'Alt',
    az: 'Az',
    footer: 'Deep Sky Planner - Astronomical Planning in Real-Time',
  },
  cz: {
    title: 'Hvězdný Plánovač',
    location: 'Lokalita',
    dateTime: 'Datum a čas',
    weather: 'Počasí (Simulace)',
    clear: 'Jasno',
    humidity: 'Vlhkost',
    seeing: 'Podmínky',
    excellent: 'Excelentní',
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
    objects: 'Objekty k pozorování',
    darkSkyMap: 'Mapa světelného znečištění',
    alt: 'Vyska',
    az: 'Azim',
    footer: 'Hvězdný Plánovač - Astronomické plánování v reálném čase',
  }
}

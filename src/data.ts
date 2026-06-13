export type DeepSkyObject = {
  id: string;
  name: string;
  commonName?: string;
  type: 'Galaxy' | 'Nebula' | 'Star Cluster' | 'Planetary Nebula';
  ra: number; // Right Ascension in decimal hours
  dec: number; // Declination in decimal degrees
  magnitude: number;
}

export const MESSIER_CATALOG: DeepSkyObject[] = [
  { id: 'M31', name: 'M31', commonName: 'Andromeda Galaxy', type: 'Galaxy', ra: 0.7123, dec: 41.269, magnitude: 3.44 },
  { id: 'M42', name: 'M42', commonName: 'Orion Nebula', type: 'Nebula', ra: 5.5881, dec: -5.391, magnitude: 4.0 },
  { id: 'M45', name: 'M45', commonName: 'Pleiades', type: 'Star Cluster', ra: 3.7836, dec: 24.11, magnitude: 1.6 },
  { id: 'M51', name: 'M51', commonName: 'Whirlpool Galaxy', type: 'Galaxy', ra: 13.498, dec: 47.195, magnitude: 8.4 },
  { id: 'M13', name: 'M13', commonName: 'Hercules Cluster', type: 'Star Cluster', ra: 16.695, dec: 36.46, magnitude: 5.8 },
  { id: 'M27', name: 'M27', commonName: 'Dumbbell Nebula', type: 'Planetary Nebula', ra: 19.993, dec: 22.721, magnitude: 7.5 },
  { id: 'M57', name: 'M57', commonName: 'Ring Nebula', type: 'Planetary Nebula', ra: 18.893, dec: 33.029, magnitude: 8.8 },
  { id: 'M81', name: 'M81', commonName: "Bode's Galaxy", type: 'Galaxy', ra: 9.926, dec: 69.065, magnitude: 6.94 },
  { id: 'M82', name: 'M82', commonName: 'Cigar Galaxy', type: 'Galaxy', ra: 9.931, dec: 69.682, magnitude: 8.41 },
  { id: 'M1', name: 'M1', commonName: 'Crab Nebula', type: 'Nebula', ra: 5.575, dec: 22.014, magnitude: 8.4 },
];

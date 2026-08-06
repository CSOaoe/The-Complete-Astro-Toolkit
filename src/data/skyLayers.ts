export interface AtlasPoint {
  id: string;
  name: string;
  raHours: number;
  decDegrees: number;
  magnitude?: number;
}

export const brightStars: AtlasPoint[] = [
  { id: "sirius", name: "Sirius", raHours: 6.75, decDegrees: -16.7, magnitude: -1.46 },
  { id: "canopus", name: "Canopus", raHours: 6.4, decDegrees: -52.7, magnitude: -0.74 },
  { id: "arcturus", name: "Arcturus", raHours: 14.26, decDegrees: 19.2, magnitude: -0.05 },
  { id: "vega", name: "Vega", raHours: 18.62, decDegrees: 38.8, magnitude: 0.03 },
  { id: "capella", name: "Capella", raHours: 5.28, decDegrees: 46, magnitude: 0.08 },
  { id: "rigel", name: "Rigel", raHours: 5.24, decDegrees: -8.2, magnitude: 0.13 },
  { id: "procyon", name: "Procyon", raHours: 7.66, decDegrees: 5.2, magnitude: 0.34 },
  { id: "betelgeuse", name: "Betelgeuse", raHours: 5.92, decDegrees: 7.4, magnitude: 0.5 },
  { id: "altair", name: "Altair", raHours: 19.85, decDegrees: 8.9, magnitude: 0.77 },
  { id: "aldebaran", name: "Aldebaran", raHours: 4.6, decDegrees: 16.5, magnitude: 0.85 },
  { id: "antares", name: "Antares", raHours: 16.49, decDegrees: -26.4, magnitude: 0.96 },
  { id: "spica", name: "Spica", raHours: 13.42, decDegrees: -11.2, magnitude: 0.98 },
  { id: "pollux", name: "Pollux", raHours: 7.76, decDegrees: 28, magnitude: 1.14 },
  { id: "fomalhaut", name: "Fomalhaut", raHours: 22.96, decDegrees: -29.6, magnitude: 1.16 },
  { id: "deneb", name: "Deneb", raHours: 20.69, decDegrees: 45.3, magnitude: 1.25 },
  { id: "regulus", name: "Regulus", raHours: 10.14, decDegrees: 12, magnitude: 1.35 },
  { id: "castor", name: "Castor", raHours: 7.58, decDegrees: 31.9, magnitude: 1.58 },
  { id: "bellatrix", name: "Bellatrix", raHours: 5.42, decDegrees: 6.3, magnitude: 1.64 },
  { id: "alnilam", name: "Alnilam", raHours: 5.6, decDegrees: -1.2, magnitude: 1.69 },
  { id: "alnitak", name: "Alnitak", raHours: 5.68, decDegrees: -1.9, magnitude: 1.74 },
  { id: "mintaka", name: "Mintaka", raHours: 5.53, decDegrees: -0.3, magnitude: 2.23 },
  { id: "dubhe", name: "Dubhe", raHours: 11.06, decDegrees: 61.8, magnitude: 1.79 },
  { id: "merak", name: "Merak", raHours: 11.03, decDegrees: 56.4, magnitude: 2.37 },
  { id: "phecda", name: "Phecda", raHours: 11.9, decDegrees: 53.7, magnitude: 2.44 },
  { id: "megrez", name: "Megrez", raHours: 12.26, decDegrees: 57, magnitude: 3.31 },
  { id: "alioth", name: "Alioth", raHours: 12.9, decDegrees: 55.9, magnitude: 1.77 },
  { id: "mizar", name: "Mizar", raHours: 13.4, decDegrees: 54.9, magnitude: 2.23 },
  { id: "alkaid", name: "Alkaid", raHours: 13.79, decDegrees: 49.3, magnitude: 1.86 },
];

export const constellationLines = [
  { name: "Orion", stars: ["betelgeuse", "bellatrix", "mintaka", "alnilam", "alnitak", "rigel"] },
  { name: "Ursa Major", stars: ["dubhe", "merak", "phecda", "megrez", "alioth", "mizar", "alkaid"] },
  { name: "Summer Triangle", stars: ["vega", "deneb", "altair", "vega"] },
];

export const meteorRadiants: AtlasPoint[] = [
  { id: "perseids", name: "Perseids", raHours: 3.07, decDegrees: 58 },
  { id: "geminids", name: "Geminids", raHours: 7.47, decDegrees: 33 },
  { id: "quadrantids", name: "Quadrantids", raHours: 15.3, decDegrees: 49 },
  { id: "leonids", name: "Leonids", raHours: 10.13, decDegrees: 22 },
  { id: "orionids", name: "Orionids", raHours: 6.35, decDegrees: 16 },
];

export const milkyWaySpine: AtlasPoint[] = Array.from({ length: 25 }, (_, index) => {
  const raHours = index;
  return {
    id: `milky-${index}`,
    name: "Milky Way",
    raHours,
    decDegrees: 52 * Math.sin(((raHours - 18) / 24) * Math.PI * 2) - 5,
  };
});

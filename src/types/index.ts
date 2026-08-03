export type TargetType = "Nebula" | "Galaxy" | "Cluster" | "Planetary Nebula";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface DeepSkyTarget {
  id: string;
  name: string;
  catalogue: string;
  identifiers: string[];
  type: TargetType;
  constellation: string;
  ra: string;
  dec: string;
  apparentSize: string;
  filters: string[];
  difficulty: Difficulty;
  description: string;
  imagingNotes: string;
  altitude?: string;
  bestTime?: string;
}

export type ProjectStatus = "Planned" | "Active" | "Completed";
export interface JournalProject {
  id: string;
  target: string;
  telescope: string;
  camera: string;
  filter: string;
  exposureLength: number;
  exposureCount: number;
  notes: string;
  status: ProjectStatus;
  createdAt: string;
}

export interface Telescope {
  id: string;
  name: string;
  aperture: number;
  focalLength: number;
  focalRatio: number;
}
export interface Camera {
  id: string;
  name: string;
  sensorWidth: number;
  sensorHeight: number;
  pixelSize: number;
  resolutionWidth: number;
  resolutionHeight: number;
}
export interface AstroFilter {
  id: string;
  name: string;
  filterType: string;
  bandwidth: number;
}
export interface ImagingRig {
  id: string;
  name: string;
  telescopeId: string;
  cameraId: string;
  filterIds: string[];
}
export interface EquipmentState {
  telescopes: Telescope[];
  cameras: Camera[];
  filters: AstroFilter[];
  rigs: ImagingRig[];
}

export interface ObserverLocation {
  latitude: number;
  longitude: number;
  label: string;
  source: "default" | "device" | "manual";
  updatedAt: string;
}

export interface CatalogueObject {
  id: string;
  name: string;
  catalogue: string;
  type: string;
  constellation: string;
  raHours: number;
  decDegrees: number;
  magnitude: number | null;
  majorAxis: number | null;
  minorAxis: number | null;
  positionAngle: number | null;
  objectKind?: "deep-sky" | "comet";
  orbitClass?: string;
  absoluteMagnitude?: number | null;
  orbitalElements?: CometOrbitalElements;
  positionDate?: string;
  curated?: DeepSkyTarget;
}

export interface CometOrbitalElements {
  eccentricity: number;
  perihelionDistanceAu: number;
  inclinationDegrees: number;
  ascendingNodeDegrees: number;
  argumentOfPerihelionDegrees: number;
  perihelionJulianDate: number;
  epochJulianDate: number | null;
}

export type SessionStatus = "Planned" | "Completed" | "Cancelled";
export interface ImagingSession {
  id: string;
  date: string;
  targetId: string;
  targetName: string;
  startTime: string;
  durationMinutes: number;
  locationName: string;
  rigName: string;
  notes: string;
  status: SessionStatus;
  conditions?: string;
  rating?: number;
  createdAt: string;
}

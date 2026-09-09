import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { sampleEquipment, sampleProjects } from "@/data/sample";
import {
  EquipmentState,
  ImagingSession,
  JournalProject,
  ObserverLocation,
  HorizonProfile,
  CalibrationFrameSet,
} from "@/types";
import { flatHorizon } from "@/utils/horizon";

const KEYS = {
  projects: "@astrotoolkit/projects",
  equipment: "@astrotoolkit/equipment",
  favourites: "@astrotoolkit/favourites",
  observer: "@astrotoolkit/observer",
  sessions: "@astrotoolkit/sessions",
  horizon: "@astrotoolkit/horizon",
  calibration: "@astrotoolkit/calibration",
};
const defaultObserver: ObserverLocation = {
  latitude: 51.4769,
  longitude: 0,
  label: "Greenwich, United Kingdom",
  source: "default",
  updatedAt: new Date(0).toISOString(),
};

interface AppDataValue {
  projects: JournalProject[];
  equipment: EquipmentState;
  favourites: string[];
  observer: ObserverLocation;
  sessions: ImagingSession[];
  horizon: HorizonProfile;
  calibrationFrames: CalibrationFrameSet[];
  loading: boolean;
  reloadData(): void;
  saveSessions(sessions: ImagingSession[]): Promise<void>;
  error: string | null;
  saveProject(project: JournalProject): Promise<void>;
  deleteProject(id: string): Promise<void>;
  saveEquipment(state: EquipmentState): Promise<void>;
  toggleFavourite(id: string): Promise<void>;
  saveObserver(observer: ObserverLocation): Promise<void>;
  saveSession(session: ImagingSession): Promise<void>;
  deleteSession(id: string): Promise<void>;
  saveHorizon(profile: HorizonProfile): Promise<void>;
  saveCalibrationFrameSet(set: CalibrationFrameSet): Promise<void>;
  deleteCalibrationFrameSet(id: string): Promise<void>;
  restoreSnapshot(snapshot: CloudSnapshot): Promise<void>;
}

export interface CloudSnapshot {
  projects: JournalProject[];
  equipment: EquipmentState;
  favourites: string[];
  observer: ObserverLocation;
  sessions: ImagingSession[];
  horizon?: HorizonProfile;
  calibrationFrames?: CalibrationFrameSet[];
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const [projects, setProjects] = useState(sampleProjects);
  const [equipment, setEquipment] = useState(sampleEquipment);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [observer, setObserver] = useState<ObserverLocation>(defaultObserver);
  const [sessions, setSessions] = useState<ImagingSession[]>([]);
  const [horizon, setHorizon] = useState<HorizonProfile>(flatHorizon);
  const [calibrationFrames, setCalibrationFrames] = useState<CalibrationFrameSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reloadData = useCallback(() => setRevision((v) => v + 1), []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.projects),
      AsyncStorage.getItem(KEYS.equipment),
      AsyncStorage.getItem(KEYS.favourites),
      AsyncStorage.getItem(KEYS.observer),
      AsyncStorage.getItem(KEYS.sessions),
      AsyncStorage.getItem(KEYS.horizon),
      AsyncStorage.getItem(KEYS.calibration),
    ])
      .then(
        ([
          storedProjects,
          storedEquipment,
          storedFavourites,
          storedObserver,
          storedSessions, storedHorizon, storedCalibration,
        ]) => {
          if (storedProjects)
            setProjects(JSON.parse(storedProjects) as JournalProject[]);
          if (storedEquipment)
            setEquipment(JSON.parse(storedEquipment) as EquipmentState);
          if (storedFavourites)
            setFavourites(JSON.parse(storedFavourites) as string[]);
          if (storedObserver)
            setObserver(JSON.parse(storedObserver) as ObserverLocation);
          if (storedSessions)
            setSessions(JSON.parse(storedSessions) as ImagingSession[]);
          if (storedHorizon) setHorizon(JSON.parse(storedHorizon) as HorizonProfile);
          if (storedCalibration) setCalibrationFrames(JSON.parse(storedCalibration) as CalibrationFrameSet[]);
        },
      )
      .catch(() =>
        setError(
          "Saved data could not be loaded. Sample data is available instead.",
        ),
      )
      .finally(() => setLoading(false));
  }, [revision]);

  const persist = useCallback(
    async <T,>(key: string, value: T, update: (next: T) => void) => {
      update(value);
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
        setError(null);
      } catch {
        setError("Your changes could not be saved to this device.");
      }
    },
    [],
  );

  const saveProject = useCallback(
    async (project: JournalProject) => {
      const next = projects.some((item) => item.id === project.id)
        ? projects.map((item) => (item.id === project.id ? project : item))
        : [project, ...projects];
      await persist(KEYS.projects, next, setProjects);
    },
    [persist, projects],
  );
  const deleteProject = useCallback(
    async (id: string) =>
      persist(
        KEYS.projects,
        projects.filter((item) => item.id !== id),
        setProjects,
      ),
    [persist, projects],
  );
  const saveEquipment = useCallback(
    async (state: EquipmentState) =>
      persist(KEYS.equipment, state, setEquipment),
    [persist],
  );
  const toggleFavourite = useCallback(
    async (id: string) =>
      persist(
        KEYS.favourites,
        favourites.includes(id)
          ? favourites.filter((item) => item !== id)
          : [...favourites, id],
        setFavourites,
      ),
    [favourites, persist],
  );
  const saveObserver = useCallback(
    async (value: ObserverLocation) =>
      persist(KEYS.observer, value, setObserver),
    [persist],
  );
  const saveSession = useCallback(
    async (session: ImagingSession) => {
      const next = sessions.some((item) => item.id === session.id)
        ? sessions.map((item) => (item.id === session.id ? session : item))
        : [session, ...sessions];
      await persist(KEYS.sessions, next, setSessions);
    },
    [persist, sessions],
  );
  const deleteSession = useCallback(
    async (id: string) =>
      persist(
        KEYS.sessions,
        sessions.filter((item) => item.id !== id),
        setSessions,
      ),
    [persist, sessions],
  );
  const saveSessions = useCallback(async (batch: ImagingSession[]) => {
    const ids = new Set(batch.map((s) => s.id));
    const next = [...batch, ...sessions.filter((s) => !ids.has(s.id))];
    await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(next));
    setSessions(next);
  }, [sessions]);
  const saveHorizon = useCallback(async (profile: HorizonProfile) => persist(KEYS.horizon, profile, setHorizon), [persist]);
  const saveCalibrationFrameSet = useCallback(async (set: CalibrationFrameSet) => {
    const next = calibrationFrames.some((item) => item.id === set.id) ? calibrationFrames.map((item) => item.id === set.id ? set : item) : [set, ...calibrationFrames];
    await persist(KEYS.calibration, next, setCalibrationFrames);
  }, [calibrationFrames, persist]);
  const deleteCalibrationFrameSet = useCallback(async (id: string) => persist(KEYS.calibration, calibrationFrames.filter((item) => item.id !== id), setCalibrationFrames), [calibrationFrames, persist]);
  const restoreSnapshot = useCallback(
    async (snapshot: CloudSnapshot) => {
      await Promise.all([
        persist(KEYS.projects, snapshot.projects, setProjects),
        persist(KEYS.equipment, snapshot.equipment, setEquipment),
        persist(KEYS.favourites, snapshot.favourites, setFavourites),
        persist(KEYS.observer, snapshot.observer, setObserver),
        persist(KEYS.sessions, snapshot.sessions, setSessions),
        snapshot.horizon ? persist(KEYS.horizon, snapshot.horizon, setHorizon) : Promise.resolve(),
        snapshot.calibrationFrames ? persist(KEYS.calibration, snapshot.calibrationFrames, setCalibrationFrames) : Promise.resolve(),
      ]);
    },
    [persist],
  );

  return (
    <AppDataContext.Provider
      value={{
        projects,
        equipment,
        favourites,
        observer,
        sessions,
        horizon,
        calibrationFrames,
        loading,
        reloadData,
        saveSessions,
        error,
        saveProject,
        deleteProject,
        saveEquipment,
        toggleFavourite,
        saveObserver,
        saveSession,
        deleteSession,
        saveHorizon,
        saveCalibrationFrameSet,
        deleteCalibrationFrameSet,
        restoreSnapshot,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}

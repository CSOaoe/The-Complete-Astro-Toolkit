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
} from "@/types";

const KEYS = {
  projects: "@astrotoolkit/projects",
  equipment: "@astrotoolkit/equipment",
  favourites: "@astrotoolkit/favourites",
  observer: "@astrotoolkit/observer",
  sessions: "@astrotoolkit/sessions",
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
  loading: boolean;
  error: string | null;
  saveProject(project: JournalProject): Promise<void>;
  deleteProject(id: string): Promise<void>;
  saveEquipment(state: EquipmentState): Promise<void>;
  toggleFavourite(id: string): Promise<void>;
  saveObserver(observer: ObserverLocation): Promise<void>;
  saveSession(session: ImagingSession): Promise<void>;
  deleteSession(id: string): Promise<void>;
  restoreSnapshot(snapshot: CloudSnapshot): Promise<void>;
}

export interface CloudSnapshot {
  projects: JournalProject[];
  equipment: EquipmentState;
  favourites: string[];
  observer: ObserverLocation;
  sessions: ImagingSession[];
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const [projects, setProjects] = useState(sampleProjects);
  const [equipment, setEquipment] = useState(sampleEquipment);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [observer, setObserver] = useState<ObserverLocation>(defaultObserver);
  const [sessions, setSessions] = useState<ImagingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.projects),
      AsyncStorage.getItem(KEYS.equipment),
      AsyncStorage.getItem(KEYS.favourites),
      AsyncStorage.getItem(KEYS.observer),
      AsyncStorage.getItem(KEYS.sessions),
    ])
      .then(
        ([
          storedProjects,
          storedEquipment,
          storedFavourites,
          storedObserver,
          storedSessions,
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
        },
      )
      .catch(() =>
        setError(
          "Saved data could not be loaded. Sample data is available instead.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

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
  const restoreSnapshot = useCallback(
    async (snapshot: CloudSnapshot) => {
      await Promise.all([
        persist(KEYS.projects, snapshot.projects, setProjects),
        persist(KEYS.equipment, snapshot.equipment, setEquipment),
        persist(KEYS.favourites, snapshot.favourites, setFavourites),
        persist(KEYS.observer, snapshot.observer, setObserver),
        persist(KEYS.sessions, snapshot.sessions, setSessions),
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
        loading,
        error,
        saveProject,
        deleteProject,
        saveEquipment,
        toggleFavourite,
        saveObserver,
        saveSession,
        deleteSession,
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

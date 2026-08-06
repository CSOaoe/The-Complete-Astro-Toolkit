import { ImagingSession } from "@/types";

export interface PowerPlanInput {
  batteryWh: number;
  reservePercent: number;
  ambientCelsius: number;
  durationHours: number;
  mountWatts: number;
  cameraWatts: number;
  computerWatts: number;
  dewHeaterWatts: number;
  accessoriesWatts: number;
}

export interface StoragePlanInput {
  freeStorageGb: number;
  frameSizeMb: number;
  exposureSeconds: number;
  overheadSeconds: number;
  durationHours: number;
}

export function dewPointCelsius(temperature: number, humidityPercent: number) {
  const humidity = Math.max(1, Math.min(100, humidityPercent));
  const a = 17.62;
  const b = 243.12;
  const gamma = Math.log(humidity / 100) + (a * temperature) / (b + temperature);
  return (b * gamma) / (a - gamma);
}

export function calculatePowerPlan(input: PowerPlanInput) {
  const loadWatts = input.mountWatts + input.cameraWatts + input.computerWatts + input.dewHeaterWatts + input.accessoriesWatts;
  const coldFactor = input.ambientCelsius <= -10 ? 0.58 : input.ambientCelsius <= 0 ? 0.7 : input.ambientCelsius < 10 ? 0.85 : 1;
  const usableWh = input.batteryWh * coldFactor * (1 - input.reservePercent / 100);
  const runtimeHours = loadWatts > 0 ? usableWh / loadWatts : 0;
  const requiredWh = loadWatts * input.durationHours;
  return {
    loadWatts,
    coldFactor,
    usableWh,
    runtimeHours,
    requiredWh,
    marginWh: usableWh - requiredWh,
    sufficient: runtimeHours >= input.durationHours,
  };
}

export function calculateStoragePlan(input: StoragePlanInput) {
  const cadence = Math.max(1, input.exposureSeconds + input.overheadSeconds);
  const plannedFrames = Math.floor((input.durationHours * 3600) / cadence);
  const capacityFrames = Math.floor((input.freeStorageGb * 1024) / Math.max(0.1, input.frameSizeMb));
  const requiredGb = (plannedFrames * input.frameSizeMb) / 1024;
  return {
    plannedFrames,
    capacityFrames,
    requiredGb,
    remainingGb: input.freeStorageGb - requiredGb,
    sufficient: capacityFrames >= plannedFrames,
  };
}

export function sessionTiming(session: ImagingSession, now = new Date()) {
  const start = new Date(`${session.date}T${session.startTime}:00`);
  const end = new Date(start.getTime() + session.durationMinutes * 60_000);
  const elapsedMinutes = (now.getTime() - start.getTime()) / 60_000;
  const progress = Math.max(0, Math.min(1, elapsedMinutes / session.durationMinutes));
  const state = now < start ? "upcoming" : now >= end ? "finished" : "running";
  return {
    start,
    end,
    elapsedMinutes,
    remainingMinutes: Math.max(0, session.durationMinutes - elapsedMinutes),
    progress,
    state,
  } as const;
}

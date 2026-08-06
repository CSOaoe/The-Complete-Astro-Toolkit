import { getCatalogueObject } from "../data/catalogue";
import { EquipmentState, HorizonProfile, ImagingCampaign, ObserverLocation } from "../types";
import { altitudeAt, moonPhase } from "./astronomy";
import { fieldOfView } from "./calculations";
import { horizonElevationAt } from "./horizon";

export interface CampaignNight {
  date: Date;
  score: number;
  peakAltitude: number;
  moonIllumination: number;
  allocatedHours: number;
  reason: string;
}

export function planCampaignNights(
  campaign: ImagingCampaign,
  observer: ObserverLocation,
  equipment: EquipmentState,
  horizon: HorizonProfile,
  start = new Date(),
): CampaignNight[] {
  const target = getCatalogueObject(campaign.targetId);
  if (!target) return [];
  const remaining = Math.max(0, campaign.requiredHours - campaign.capturedHours);
  const rig = equipment.rigs.find((item) => item.id === campaign.rigId) ?? equipment.rigs[0];
  const scope = equipment.telescopes.find((item) => item.id === rig?.telescopeId);
  const camera = equipment.cameras.find((item) => item.id === rig?.cameraId);
  const frame = scope && camera ? Math.min(fieldOfView(camera.sensorWidth, scope.focalLength), fieldOfView(camera.sensorHeight, scope.focalLength)) : null;
  const size = (target.majorAxis ?? 30) / 60;
  const fit = frame === null ? 6 : size <= frame * 0.9 ? 10 : size <= frame * 1.5 ? 6 : 2;
  const candidates = Array.from({ length: Math.max(1, campaign.nightsToPlan) }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    date.setHours(23, 30, 0, 0);
    let peakAltitude = -90;
    for (let offset = -3; offset <= 4; offset += 1) {
      const at = new Date(date.getTime() + offset * 3_600_000);
      peakAltitude = Math.max(peakAltitude, altitudeAt(target.raHours * 15, target.decDegrees, observer, at));
    }
    const moonIllumination = moonPhase(date).illumination;
    const horizonPenalty = peakAltitude <= horizonElevationAt(horizon, 180) + 8 ? 35 : 0;
    const score = Math.round(Math.max(0, Math.min(100, peakAltitude * 0.9 + (100 - moonIllumination) * 0.35 + fit * 2 - horizonPenalty)));
    return { date, score, peakAltitude, moonIllumination };
  }).filter((night) => night.peakAltitude >= 15).sort((a, b) => b.score - a.score);
  let hoursLeft = remaining;
  const allocated = candidates.map((night) => {
    const allocatedHours = Math.min(3, hoursLeft);
    hoursLeft -= allocatedHours;
    return {
      ...night,
      allocatedHours,
      reason: night.score >= 75 ? "Prime imaging night" : night.score >= 50 ? "Useful backup night" : "Low altitude or bright Moon",
    };
  }).filter((night) => night.allocatedHours > 0);
  return allocated.sort((a, b) => a.date.getTime() - b.date.getTime());
}

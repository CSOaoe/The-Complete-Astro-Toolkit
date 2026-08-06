import { getCatalogueObject, searchCatalogue } from "../data/catalogue";
import { CatalogueObject, ImagingSession } from "../types";

export function collectOfflineTargets(favouriteIds: string[], sessions: ImagingSession[]) {
  const unique = new Map<string, CatalogueObject>();
  for (const id of favouriteIds) {
    const target = getCatalogueObject(id);
    if (target) unique.set(target.id, target);
  }
  for (const session of sessions.filter((item) => item.status === "Planned")) {
    const target = session.targetId ? getCatalogueObject(session.targetId) : searchCatalogue(session.targetName, "All", 1)[0];
    if (target) unique.set(target.id, target);
  }
  return [...unique.values()].slice(0, 12);
}

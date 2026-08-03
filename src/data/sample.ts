import { EquipmentState, JournalProject } from '@/types';

export const sampleProjects: JournalProject[] = [{
  id: 'sample-orion', target: 'M42 Orion Nebula', telescope: '80mm APO', camera: 'APS-C Cooled Camera', filter: 'Dual Band',
  exposureLength: 180, exposureCount: 40, notes: 'Capture short core exposures after the main sequence.', status: 'Active', createdAt: new Date().toISOString(),
}];

export const sampleEquipment: EquipmentState = {
  telescopes: [{ id: 'scope-1', name: '80mm APO', aperture: 80, focalLength: 480, focalRatio: 6 }],
  cameras: [{ id: 'camera-1', name: 'APS-C Cooled Camera', sensorWidth: 23.5, sensorHeight: 15.7, pixelSize: 3.76, resolutionWidth: 6248, resolutionHeight: 4176 }],
  filters: [{ id: 'filter-1', name: 'Dual Band', filterType: 'Ha/OIII', bandwidth: 7 }],
  rigs: [{ id: 'rig-1', name: 'Wide-field rig', telescopeId: 'scope-1', cameraId: 'camera-1', filterIds: ['filter-1'] }],
};

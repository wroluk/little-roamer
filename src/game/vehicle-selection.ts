import { DEFAULT_VEHICLE_MODEL, type VehicleModelId } from './vehicle';

export function vehicleAvailable(area: string, model: string): model is VehicleModelId {
  return area === 'mars' || area === 'moon'
    ? model === 'mars-scout' || model === 'lunar-rover' : model === 'modern' || model === 'classic';
}

export function explorationVehicle(area: 'mars' | 'moon', requested: string | null): VehicleModelId {
  if (requested && vehicleAvailable(area, requested)) return requested;
  return area === 'moon' ? 'lunar-rover' : 'mars-scout';
}

export function earthVehicle(requested: string | null, stored: string | null): VehicleModelId {
  if (requested && vehicleAvailable('earth', requested)) return requested;
  if (stored && vehicleAvailable('earth', stored)) return stored;
  return DEFAULT_VEHICLE_MODEL;
}

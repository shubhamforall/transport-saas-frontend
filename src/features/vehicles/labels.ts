import type { Vehicle, VehicleType } from '@/types/api';
import { milliToInput } from '@/lib/money';

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'MINI_TRUCK', label: 'Mini truck' },
  { value: 'LCV', label: 'Light commercial vehicle' },
  { value: 'MEDIUM_TRUCK', label: 'Medium truck' },
  { value: 'HEAVY_TRUCK', label: 'Heavy truck' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'CONTAINER_TRUCK', label: 'Container truck' },
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'OTHER', label: 'Other' },
];

export const OWNERSHIP = [
  { value: 'OWNED', label: 'Company owned' },
  { value: 'LEASED', label: 'Leased' },
  { value: 'ATTACHED', label: 'Attached / third-party' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const UNITS = [
  { value: 'TONNES', label: 'Tonnes' },
  { value: 'KG', label: 'Kilograms' },
  { value: 'CUBIC_METRES', label: 'Cubic metres' },
] as const;

export const vehicleTypeLabel = (t: VehicleType) =>
  VEHICLE_TYPES.find((v) => v.value === t)?.label ?? t;
export const ownershipLabel = (o: Vehicle['ownershipType']) =>
  OWNERSHIP.find((x) => x.value === o)?.label ?? '—';

export function capacityLabel(v: Pick<Vehicle, 'capacityMilli' | 'capacityUnit'>) {
  if (v.capacityMilli === null) return '—';
  const unit = UNITS.find((u) => u.value === v.capacityUnit)?.label.toLowerCase() ?? '';
  return `${milliToInput(v.capacityMilli)} ${unit}`.trim();
}

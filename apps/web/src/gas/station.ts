import { REFERENCE_STATION, stationByCode, stationForPostcode, type Station } from '@p1/shared';
import type { GasSettings } from '../settings/storage';

/** The station in use: picked by hand, else nearest to the postcode, else De Bilt (§5). */
export function stationOf(gas: GasSettings): { station: Station; located: boolean } {
  const picked = gas.station === undefined ? undefined : stationByCode(gas.station);
  const near = gas.postcode ? stationForPostcode(gas.postcode) : undefined;
  const station = picked ?? near;
  return station
    ? { station, located: true }
    : { station: stationByCode(REFERENCE_STATION)!, located: false };
}

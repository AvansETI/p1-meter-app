/** Static description of a logger type, selected by the signature prefix. */
export interface DeviceProfile {
  prefix: string;
  /** Dynamic part without dashes: chip ID + flash chip ID. */
  dynamicPattern: RegExp;
  measurement: string;
  sampleIntervalSec: number;
  liveMaxAgeSec: number;
}

export const EMON_V01: DeviceProfile = {
  prefix: '2019-ETI-EMON-V01',
  dynamicPattern: /^[0-9A-F]{12}$/,
  measurement: 'dsmr',
  sampleIntervalSec: 20,
  liveMaxAgeSec: 300,
};

/** Profile used for user input; other prefixes are not supported yet. */
export const DEFAULT_PROFILE = EMON_V01;

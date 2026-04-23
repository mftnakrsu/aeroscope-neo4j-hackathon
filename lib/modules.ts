/**
 * Modules currently loaded into the AeroScope Aura instance.
 *
 * The synthetic corpus covers 30 modules — full coverage across avionics,
 * mission, power, propulsion, structures, and cyber. All 30 are loaded into
 * the graph for the live demo. Extend this list if you add more modules.
 */
export const MODULES = [
  // Avionics core
  { code: "FCC", name: "FCC", role: "Flight Control Computer" },
  { code: "FMS", name: "FMS", role: "Flight Management System" },
  { code: "AUTO", name: "AUTO", role: "Autopilot" },
  { code: "NAV", name: "NAV", role: "Navigation" },
  { code: "INS", name: "INS", role: "Inertial Navigation System" },
  { code: "GPS", name: "GPS", role: "GPS Receiver" },
  { code: "ADS", name: "ADS", role: "Air Data System" },

  // Comms & data links
  { code: "COMM", name: "COMM", role: "Communications" },
  { code: "CDL", name: "CDL", role: "Common Data Link" },
  { code: "DLNK", name: "DLNK", role: "Data Link" },

  // Sensing & payload
  { code: "RADAR", name: "RADAR", role: "Radar" },
  { code: "EOIR", name: "EOIR", role: "Electro-Optical / Infra-Red" },
  { code: "SAR", name: "SAR", role: "Synthetic Aperture Radar" },
  { code: "PLD", name: "PLD", role: "Payload Management" },

  // Ground & HMI
  { code: "GCS", name: "GCS", role: "Ground Control Station" },
  { code: "HMI", name: "HMI", role: "Human-Machine Interface" },

  // Power & propulsion
  { code: "PWR", name: "PWR", role: "Power Distribution" },
  { code: "EPS", name: "EPS", role: "Electrical Power System" },
  { code: "APM", name: "APM", role: "Auxiliary Power Management" },
  { code: "ENG", name: "ENG", role: "Engine" },
  { code: "FUEL", name: "FUEL", role: "Fuel System" },

  // Vehicle systems
  { code: "LDG", name: "LDG", role: "Landing Gear" },
  { code: "LGT", name: "LGT", role: "External Lighting" },
  { code: "ICE", name: "ICE", role: "De-ice / Anti-ice" },
  { code: "TCS", name: "TCS", role: "Thermal Control" },
  { code: "STR", name: "STR", role: "Structures & Airframe" },

  // Safety & recording
  { code: "BIT", name: "BIT", role: "Built-In Test" },
  { code: "FDR", name: "FDR", role: "Flight Data Recorder" },
  { code: "EMS", name: "EMS", role: "Emergency Management" },

  // Cyber
  { code: "SEC", name: "SEC", role: "Cyber & Secure Boot" },
] as const;

export type ModuleEntry = (typeof MODULES)[number];

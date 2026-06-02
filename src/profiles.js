// Per-profile configuration. The router, map, complete and splash screens are
// all driven by this data so the engine is profile-agnostic.
//
// `screen` is a key into the router's SCREENS map. Dave's "mult" world resolves
// to mult-tap (L1-3) / mult-drag (L4-6) inside the router; everything else maps
// 1:1.
import { banji, mo, pip, handler } from "./svg.js";

export const PROFILES = {
  dave: {
    id: "dave", label: "DAVE", age: 5, prefix: "dave",
    title: "DAVE'S MATH", mapTitle: "PICK A LEVEL",
    levelsPerWorld: 6,
    worlds: [
      { id: "add",  name: "BANANA HILLS",   screen: "add"  },
      { id: "sub",  name: "MISTY RIVER",    screen: "sub"  },
      { id: "mult", name: "FIREFLY MEADOW", screen: "mult" },
    ],
    splashMascot: banji,
    completeMascot: (world) => (world === "add" ? banji : world === "sub" ? mo : pip),
  },
  daniel: {
    id: "daniel", label: "DANIEL", age: 11, prefix: "daniel",
    title: "CODE BREAKERS", mapTitle: "MISSION BOARD",
    levelsPerWorld: 5,
    worlds: [
      { id: "nadd", name: "OP: STOCKPILE", screen: "col-add"   },
      { id: "nsub", name: "OP: GETAWAY",   screen: "col-sub"   },
      { id: "nmul", name: "OP: OVERRIDE",  screen: "long-mult" },
      { id: "ndiv", name: "OP: SPLIT",     screen: "short-div" },
    ],
    splashMascot: handler,
    completeMascot: () => handler,
  },
};

export const worldIdsOf = (p) => p.worlds.map((w) => w.id);
export const worldOf = (p, id) => p.worlds.find((w) => w.id === id);

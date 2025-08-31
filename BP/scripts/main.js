// Einstiegspunkt – ruft nur die Registrierungsfunktionen auf.
// (Keine Logikänderung gegenüber deiner Single-Datei)
import { registerWorldEvents } from "./events/world.js";
import { registerItemEvents } from "./events/itemUse.js";
import { getTime } from "./test.js";

console.warn(getTime(1));
registerWorldEvents();
registerItemEvents();

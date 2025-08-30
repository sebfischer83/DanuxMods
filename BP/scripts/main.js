// Einstiegspunkt – ruft nur die Registrierungsfunktionen auf.
// (Keine Logikänderung gegenüber deiner Single-Datei)
import { registerWorldEvents } from "./events/world.js";
import { registerItemEvents } from "./events/itemUse.js";

registerWorldEvents();
registerItemEvents();

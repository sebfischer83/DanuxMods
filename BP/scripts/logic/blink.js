import { BLINK_DISTANCE, PATH_RADIUS, DAMAGE, STEP, ITEM_ID, ULTIMA_SWORD_PARTICLE } from "../config.js";
import { add, mul, len2D } from "../utils/vector.js";
import { isSafeStand } from "../utils/blocks.js";
import { EntityOnFireComponent, EntityComponentTypes, Entity } from "@minecraft/server";
import { spawnRing } from "./particle.js"

// Hilfsfunktionen – 1:1 wie in deiner Datei
const floor = v => ({ x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) });

function isDamageable(e) {
  if (!e || !e.isValid()) return false;
  try { return !!e.getComponent("minecraft:health"); } catch { return false; }
}

// PvP vermeiden? (Falls server.properties pvp=false, triff nur Mobs)
function isAllyOrSelf(player, e) {
  try {
    if (e.id === player.id) return true;
    return e.typeId === "minecraft:player";
  } catch {
    return false;
  }
}

export function handleBlinkUse(player) {
  const dim = player.dimension;
  const start = player.location;

  // Blick horizontal
  let dir = player.getViewDirection();
  dir = { x: dir.x, y: 0, z: dir.z };
  const L = len2D(dir);
  if (L < 1e-6) return;
  dir = { x: dir.x / L, y: 0, z: dir.z };

  const maxSteps = Math.max(1, Math.floor(BLINK_DISTANCE / STEP));
  let lastSafe = start;

  // Zum Deduplizieren und Debuggen
  const hitMap = new Map(); // id -> entity

  for (let i = 1; i <= maxSteps; i++) {
    const p = add(start, mul(dir, i * STEP));
    p.y = start.y;

    if (!isSafeStand(dim, p)) break;
    lastSafe = p;

    // Entities im Korridor
    for (const e of dim.getEntities({ location: p, maxDistance: PATH_RADIUS })) {
      if (!isDamageable(e)) continue;
      hitMap.set(e.id, e);
    }
  }

  // Nichts Sicheres?
  if (Math.hypot(lastSafe.x - start.x, lastSafe.z - start.z) < 0.01) {
    player.sendMessage("⛔ Kein sicherer Platz voraus.");
    return;
  }

  // Teleport
  try {
    player.teleport(lastSafe, { dimension: dim, keepVelocity: false });
  } catch {
    player.sendMessage("❌ Teleport fehlgeschlagen.");
    return;
  }

  // Schaden austeilen
  let hits = 0;
  for (const e of hitMap.values()) {
    // Wenn PvP aus ist, Spieler überspringen (so hast du trotzdem Feedback auf Mobs)
    if (isAllyOrSelf(player, e)) continue;
    try {
      // einfache Variante: nur Betrag
      e.applyDamage?.(DAMAGE);
      spawnRing(e, ULTIMA_SWORD_PARTICLE);
      let health = e.getComponent?.(EntityComponentTypes.Health);
      hits++;
      player.sendMessage(`→ getroffen: ${e.typeId} noch ${health.currentValue} Herzen`);
    } catch {
      // Fallback: gar nichts
    }
  }

  // Falls gar niemand Schaden bekommen hat: kurze Hilfe
  if (hits === 0 && hitMap.size > 0) {
    // hier waren nur Spieler im Weg (bei pvp=false) -> Hinweis
    player.sendMessage("⚠️ Ziele im Weg, aber PvP/Spieler-Schaden ist blockiert.");
  } else {
    player.sendMessage(`✧ Blink! ${hits} Ziele getroffen.`);
  }
}

export const BLINK_ITEM_ID = ITEM_ID;

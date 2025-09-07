// blink.ts
import {
  BLINK_DISTANCE,
  PATH_RADIUS,
  DAMAGE,
  STEP,
  ITEM_ID,
  ULTIMA_SWORD_PARTICLE,
} from "../config.js";
import { add, mul } from "../utils/vector.js"; // nutzt Vector3-kompatible Vektoren
import { isSafeStand } from "../utils/blocks.js";
import {
  EntityComponentTypes,
  Entity,
  Player,
  Dimension,
  EntityHealthComponent,
  Vector3,
} from "@minecraft/server";
import { spawnRing } from "./particle.js";

const floor = (v: Vector3): Vector3 => ({
  x: Math.floor(v.x),
  y: Math.floor(v.y),
  z: Math.floor(v.z),
});

function isDamageable(e: Entity | undefined | null): boolean {
  if (!e || !e.isValid) return false;
  try {
    const byEnum = e.getComponent(
      EntityComponentTypes.Health
    ) as EntityHealthComponent | undefined;
    if (byEnum) return true;

    // Fallback für ältere Signaturen
    const byString = e.getComponent(
      "minecraft:health"
    ) as EntityHealthComponent | undefined;
    return !!byString;
  } catch {
    return false;
  }
}

// PvP vermeiden? (Wenn serverseitig Spieler-Schaden blockiert ist)
function isAllyOrSelf(player: Player, e: Entity): boolean {
  try {
    if (e.id === player.id) return true;
    return e.typeId === "minecraft:player";
  } catch {
    return false;
  }
}

export function handleBlinkUse(player: Player): void {
  const dim: Dimension = player.dimension;
  const start: Vector3 = player.location;

  // Blickrichtung auf horizontal projizieren
  let dir = player.getViewDirection();
  dir = { x: dir.x, y: 0, z: dir.z };
  const L = Math.hypot(dir.x, dir.z);
  if (L < 1e-6) return;
  dir = { x: dir.x / L, y: 0, z: dir.z };

  const maxSteps = Math.max(1, Math.floor(BLINK_DISTANCE / STEP));
  let lastSafe: Vector3 = start;

  const hitMap = new Map<string, Entity>();

  for (let i = 1; i <= maxSteps; i++) {
    const p: Vector3 = add(start, mul(dir, i * STEP));
    // Höhe konstant halten
    (p as Vector3).y = start.y;

    if (!isSafeStand(dim, p)) break;
    lastSafe = p;

    // Mobs/Entities im Korridor sammeln (dedupliziert per ID)
    for (const e of dim.getEntities({ location: p, maxDistance: PATH_RADIUS })) {
      if (!isDamageable(e)) continue;
      hitMap.set(e.id, e);
    }
  }

  // Kein sicherer Platz?
  if (Math.hypot(lastSafe.x - start.x, lastSafe.z - start.z) < 0.01) {
    player.sendMessage("⛔ Kein sicherer Platz voraus.");
    return;
  }

  try {
    player.teleport(lastSafe, { dimension: dim, keepVelocity: false });
  } catch {
    player.sendMessage("❌ Teleport fehlgeschlagen.");
    return;
  }

  let hits = 0;
  for (const e of hitMap.values()) {
    if (isAllyOrSelf(player, e)) continue;
    try {
      // applyDamage ist in neueren APIs vorhanden
      e.applyDamage?.(DAMAGE);
      spawnRing(e, ULTIMA_SWORD_PARTICLE);

      const hpComp =
        (e.getComponent(
          EntityComponentTypes.Health
        ) as EntityHealthComponent | undefined) ??
        (e.getComponent("minecraft:health") as
          | EntityHealthComponent
          | undefined);
      const hp = hpComp?.currentValue;

      hits++;
      if (typeof hp === "number") {
        player.sendMessage(`→ getroffen: ${e.typeId} | HP: ${hp}`);
      } else {
        player.sendMessage(`→ getroffen: ${e.typeId}`);
      }
    } catch {
      // still & silent
    }
  }

  // if (hits === 0 && hitMap.size > 0) {
  //   player.sendMessage("⚠️ Ziele im Weg, aber PvP/Spieler-Schaden ist blockiert.");
  // } else {
  //   player.sendMessage(`✧ Blink! ${hits} Ziele getroffen.`);
  // }
}

export const BLINK_ITEM_ID: string = ITEM_ID;

import { Entity, world, system, Block, Player, Vector3, Dimension } from "@minecraft/server";

export function handleFlamethrower(e: Player): void {
  const sneaking = e.isSneaking ?? false;

  if (sneaking) {
    spawnFlameWall(e);
  } else {
    // Normal Use → Fireball
    shootFireball(e);
  }
}

function log(player: Player, msg: string) {
  try { player.sendMessage(msg); } catch { }
}

function shootFireball(player: Player): void {
  const dir = player.getViewDirection();
  const eye = player.getHeadLocation();

  // Start etwas vor dem Kopf, damit er nicht sofort am Spieler kollidiert
  const start = {
    x: eye.x + dir.x * 1.4,
    y: eye.y + dir.y * 0.8,
    z: eye.z + dir.z * 1.4
  };

  try {
    const fb = player.dimension.spawnEntity("minecraft:fireball", start);
    const speed = 1.6; // ggf. anpassen
    fb.applyImpulse({ x: dir.x * speed, y: dir.y * speed, z: dir.z * speed });
    // Optional: Tag für Owner
    try { fb.addTag(`owner:${player.id}`); } catch { }
  } catch (e) {
    player.sendMessage(`§cKonnte Fireball nicht spawnen: ${e}`);
  }
}


// ==== kleine Helfer ====
const v2len = (x: number, z: number) => Math.hypot(x, z);
const norm2 = (x: number, z: number) => {
  const L = v2len(x, z) || 1;
  return { x: x / L, z: z / L };
};
const lateralFrom = (f: { x: number; z: number }) => {
  // 90° nach links drehen und normalisieren
  const L = v2len(f.x, f.z) || 1;
  return { x: -f.z / L, z: f.x / L };
};
const forwardDirXZ = (p: Player) => {
  const d = p.getViewDirection();
  return norm2(d.x, d.z);
};

// auf Blockkoordinaten „snappen“
const toBlockPos = (v: Vector3) => ({
  x: Math.floor(v.x),
  y: Math.floor(v.y),
  z: Math.floor(v.z),
});
const toBlockPosXYZ = (x: number, y: number, z: number) => ({
  x: Math.floor(x),
  y: Math.floor(y),
  z: Math.floor(z),
});


function isAirLike(b: Block | undefined | null): boolean {
  if (!b) return false;
  const t = b.typeId;
  // hier nur "echte" Luft zulassen; Feuer darf nicht auf Wasser/Lava platziert werden
  return t === "minecraft:air" || t === "minecraft:cave_air" || t === "minecraft:void_air";
}

function isSolidTop(b: Block | undefined | null): boolean {
  if (!b) return false;
  // einfache Heuristik: kein Fluid & nicht air & kein feuertyp
  const t = b.typeId;
  if (!t || t.startsWith("minecraft:") === false) return false;
  if (t === "minecraft:air" || t === "minecraft:cave_air" || t === "minecraft:void_air") return false;
  if (t.includes("water") || t.includes("lava") || t.includes("fire")) return false;
  return true;
}

/** Suche eine sinnvolle Y für Feuer: finde den ersten Air-Block, dessen Unterblock solide ist. */
function findFireY(dim: Dimension, x: number, yHint: number, z: number): number | null {
  // Starte nahe Spielerhöhe, scanne ein kleines Fenster um yHint
  const baseY = Math.floor(yHint);
  const minY = Math.max(-64, baseY - 4);
  const maxY = Math.min(320, baseY + 6);

  for (let y = minY; y <= maxY; y++) {
    const pos = toBlockPosXYZ(x, y, z);
    const here = dim.getBlock(pos);
    const below = dim.getBlock({ x: pos.x, y: pos.y - 1, z: pos.z });
    if (isAirLike(here) && isSolidTop(below)) {
      return pos.y; // hier steht Luft, unten ist solide → guter Platz für Feuer
    }
  }
  return null;
}

/**
 * Setzt temporär Feuer und hält es bis totalTicks “am Leben”.
 * Danach wird es sauber entfernt (falls noch Feuer).
 *
 * @param dim           Dimension
 * @param pos           Weltposition (Floats ok; intern Block-Snap)
 * @param totalTicks    Gesamtdauer in Ticks (20 Ticks ≈ 1s)
 * @param refreshEvery  Wie oft nachzünden (Ticks), 3–5 ist gut
 */
function placeTempFire(dim: Dimension, pos: Vector3, totalTicks: number, refreshEvery = 5): void {
  const bp = toBlockPos(pos);
  const belowPos = { x: bp.x, y: bp.y - 1, z: bp.z };
  const below = dim.getBlock(belowPos);
  if (!isSolidTop(below)) return;

  let remaining = Math.max(1, totalTicks);
  let cleared = false;

  const ensureFire = () => {
    if (cleared) return;
    const here = dim.getBlock(bp);
    if (!here) return;

    // Nur auf Luft nachzünden (vermeidet Überschreiben fremder Blöcke)
    if (isAirLike(here)) {
      try { here.setType("minecraft:fire"); } catch { /* z. B. geschützte Bereiche */ }
    }
  };

  // Erstes Setzen
  ensureFire();

  // Keep-Alive-Loop
  const loop = system.runInterval(() => {
    remaining -= refreshEvery;

    // alle refreshEvery Ticks nachzünden, falls es zwischendurch ausging
    ensureFire();

    if (remaining <= 0) {
      // am Ende Feuer nur entfernen, wenn es noch Feuer ist
      const now = dim.getBlock(bp);
      if (now && now.typeId === "minecraft:fire") {
        try { now.setType("minecraft:air"); } catch { }
      }
      cleared = true;
      system.clearRun(loop);
    }
  }, Math.max(1, refreshEvery));
}

/** FLAMMENWAND: 6 breit, 10 Schritte nach vorn; sicherer Startabstand & Ground-Snap */
export function spawnFlameWall(player: Player): void {
  const dim = player.dimension;
  const origin = player.location;

  const forw = forwardDirXZ(player);      // horizontal, normalisiert
  const lat = lateralFrom(forw);          // orthogonal, normalisiert

  const startDist = 3.0;   // mindestens 3 Blöcke vor dir starten (Selbstschutz)
  const steps = 10;
  const stepLen = 1.2;
  const safeR = 2.5;       // Radius um dich, in dem nichts platziert wird

  for (let s = 0; s < steps; s++) {
    const dist = startDist + s * stepLen;

    // Center entlang der Blickrichtung (XZ), Y erst per Ground-Snap bestimmen
    const cx = origin.x + forw.x * dist;
    const cz = origin.z + forw.z * dist;
    const cy = findFireY(dim, cx, origin.y, cz);
    if (cy === null) continue;

    const center: Vector3 = { x: cx, y: cy, z: cz };

    system.runTimeout(() => {
      // 6 Spuren quer: -3..+2
      for (let i = -3; i <= 2; i++) {
        const px = center.x + lat.x * i;
        const pz = center.z + lat.z * i;
        const py = findFireY(dim, px, cy, pz);
        if (py === null) continue;

        // Sicherheitsabstand (nur XZ)
        const dx = px - origin.x;
        const dz = pz - origin.z;
        if (Math.hypot(dx, dz) < safeR) continue;

        const pos: Vector3 = { x: px, y: py, z: pz };

        // Feuer setzen (mit Block-Snap innen)
        placeTempFire(dim, pos, 100, 4);

        // Gegner anzünden/schädigen
        const ents =
          dim.getEntities({
            location: pos,
            maxDistance: 1.3,
            excludeTypes: ["item", "xp_orb"],
          }) ?? [];

        for (const e of ents) {
          if (e.id === player.id) continue;
          try {
            e.setOnFire(3, true); // 3s, mit Partikel/Effekt
          } catch { }
          try {
            e.applyDamage?.(3);
          } catch { }
        }
      }
    }, s * 2); // Wand „wächst“ nach vorne
  }
}
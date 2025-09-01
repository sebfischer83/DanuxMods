import { Entity, world, system, Player, Vector3, Dimension } from "@minecraft/server";

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

async function cmdP(p: Player, s: string) {
    try {
        const r = await p.runCommandAsync(s);
        if (!r.successCount) log(p, `cmd no-effect: ${s}`);
    } catch (e) {
        log(p, `cmd error: ${s} -> ${e}`);
    }
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

function forwardDirXZ(p: Player) {
    const v = p.getViewDirection();
    const len = Math.hypot(v.x, v.z) || 1;
    return { x: v.x / len, z: v.z / len };
}

/** "solide genug" Untergrund (kein Luft/Wasser/Lava) */
function isGroundType(tid: string) {
    return tid !== "minecraft:air"
        && tid !== "minecraft:water"
        && tid !== "minecraft:flowing_water"
        && tid !== "minecraft:lava"
        && tid !== "minecraft:flowing_lava";
}

/** findet Boden-y (scannt etwas nach unten), gibt y der Luft über Boden zurück */
function findFireY(dim: Dimension, x: number, yStart: number, z: number) {
    let y = Math.floor(yStart);
    try {
        // bis 4 Blöcke nach unten suchen
        for (let d = 0; d < 5; d++) {
            const below = dim.getBlock({ x: Math.floor(x), y: y - 1, z: Math.floor(z) });
            if (below && isGroundType(below.typeId)) break;
            y--;
        }
        return y; // hier sollte Luft sein, Boden ist y-1
    } catch {
        return y;
    }
}

/** setzt temporär Feuer, ohne isSolid */
function placeTempFire(dim: Dimension, pos: Vector3, ticks = 40) {
    try {
        const b = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
        const target = dim.getBlock(b);
        if (!target || target.typeId !== "minecraft:air") return;
        target.setType("minecraft:fire");
        system.runTimeout(() => {
            try { if (dim.getBlock(b)?.typeId === "minecraft:fire") dim.getBlock(b)!.setType("minecraft:air"); } catch { }
        }, ticks);
    } catch { }
}

/** orthogonal (rechts) auf XZ-Ebene */
function lateralFrom(forw: { x: number, z: number }) {
    const v = { x: -forw.z, z: forw.x };
    const len = Math.hypot(v.x, v.z) || 1;
    return { x: v.x / len, z: v.z / len };
}

/** FLAMMENWAND: 6 breit, 10 Schritte nach vorn; sicherer Startabstand & Ground-Snap */
function spawnFlameWall(player: Player) {
    const dim = player.dimension;
    const forw = forwardDirXZ(player);            // horizontal
    const lat = lateralFrom(forw);
    const origin = player.location;

    const startDist = 3.0;       // <<< mindestens 3 Blöcke vor dir starten
    const steps = 10;
    const stepLen = 1.2;
    const safeR = 2.5;       // <<< in diesem Radius um dich kein Feuer setzen

    for (let s = 0; s < steps; s++) {
        const dist = startDist + s * stepLen;
        // Center auf XZ, Y später auf Boden snappen
        const cx = origin.x + forw.x * dist;
        const cz = origin.z + forw.z * dist;
        const cy = findFireY(dim, cx, origin.y, cz);      // Bodenhöhe ermitteln

        const center: Vector3 = { x: cx, y: cy, z: cz };

        system.runTimeout(() => {
            // 6 Spuren: -3..+2
            for (let i = -3; i <= 2; i++) {
                const px = center.x + lat.x * i;
                const pz = center.z + lat.z * i;
                const py = findFireY(dim, px, cy, pz);

                // Sicherheitsabstand: kein Feuer zu nah am Spieler
                const dx = px - origin.x, dz = pz - origin.z;
                if (Math.hypot(dx, dz) < safeR) continue;

                const pos: Vector3 = { x: px, y: py, z: pz };

                // Feuer setzen
                placeTempFire(dim, pos, 40);

                // Gegner anzünden/schädigen (stabile API, ohne "cause")
                const ents = dim.getEntities({ location: pos, maxDistance: 1.3, excludeTypes: ["item", "xp_orb"] }) ?? [];
                for (const e of ents) {
                    if (e.id === player.id) continue;
                    try { e.setOnFire(3, true); } catch { }
                    try { e.applyDamage?.(3); } catch { }
                }
            }
        }, s * 2); // läuft nach vorn
    }
}
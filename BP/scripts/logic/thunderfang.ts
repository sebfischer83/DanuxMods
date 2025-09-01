import { Entity, EntityComponentTypes, EntityInventoryComponent, EquipmentSlot, Player, system } from "@minecraft/server";

const COOLDOWN_TICKS = 20;           // ~1s
const CHAIN_JUMPS = 3;               // max. zusätzliche Ziele (ohne Startopfer)
const CHAIN_RADIUS = 6;              // Suchradius je Sprung
const CD_TAG = "thunder_cd";

function dist2(a: { x: number, y: number, z: number }, b: { x: number, y: number, z: number }) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

// sehr einfache Filterung: nur "lebensähnliche" Ziele, keine Spieler/Projektile/Items
function isMobLike(e: Entity): boolean {
    if (e instanceof Player) return false;
    const id = e.typeId ?? "";
    const blacklist = new Set([
        "minecraft:item", "minecraft:xp_orb", "minecraft:lightning_bolt",
        "minecraft:arrow", "minecraft:snowball", "minecraft:egg",
        "minecraft:boat", "minecraft:minecart", "minecraft:area_effect_cloud",
        "minecraft:interaction", "minecraft:thrown_trident", "minecraft:fireball"
    ]);
    return !blacklist.has(id);
}

// Nächstes Ziel nah an "from" suchen, das noch nicht getroffen wurde
function findNextTarget(from: Entity, visited: Set<string>): Entity | undefined {
    const dim = from.dimension;
    const center = from.location;
    const candidates = dim.getEntities({ location: center, maxDistance: CHAIN_RADIUS });

    const next = candidates
        .filter((e) => isMobLike(e) && !visited.has(e.id))
        .sort((a, b) => dist2(a.location, center) - dist2(b.location, center))[0];

    return next;
}

export function attack(target: Entity, player: Entity) {
    const dim = target.dimension;

    // Start: Opfer blitzen
    try { dim.spawnEntity("minecraft:lightning_bolt", target.location); } catch { }

    // Chain: bis zu N weitere Ziele
    const visited = new Set<string>([target.id]);
    let current: Entity = target;
    let jumps = 0;

    while (jumps < CHAIN_JUMPS) {
        const next = findNextTarget(current, visited);
        if (!next) break;

        try { next.dimension.spawnEntity("minecraft:lightning_bolt", next.location); } catch { }
        visited.add(next.id);
        current = next;
        jumps++;
    }
}
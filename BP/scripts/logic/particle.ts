import {
    world,
    EntityComponentTypes,
    EquipmentSlot,
    EntityDamageCause,
    Entity,
} from "@minecraft/server";

export function spawnRing(entity: Entity, effect: string, {
    radius = 1.1,
    count = 12,
    yOffset = -0.3,
} = {}) {
    const dim = entity.dimension;
    const base = entity.getHeadLocation();
    const y = base.y + yOffset;

    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        dim.spawnParticle(effect, {
            x: base.x + Math.cos(a) * radius,
            y,
            z: base.z + Math.sin(a) * radius,
        });
    }
}
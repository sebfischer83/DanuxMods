import { Entity, EntityDamageCause } from "@minecraft/server";

export function handleBanhammer(player: Entity, target: Entity) {
    try {
        target.applyDamage(999999, {
            cause: EntityDamageCause.magic,
            damagingEntity: player
        });
    } catch (_) {
        try { target.kill?.(); } catch (_) { }
    }
}
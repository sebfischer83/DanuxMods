import { Entity, Player } from "@minecraft/server";


export function handleDeathbringer(player: Player): void {
    player.applyKnockback({ x: 0, z: 0 }, 0.85);
    player.setDynamicProperty("danux:last_launch_ts", Date.now());
}

export function handleDeathbringerAttack(player: Player, target: Entity): void {
    player.sendMessage("attack");
    if (!target) return;

    const ts = (player.getDynamicProperty("danux:last_launch_ts") as number) ?? 0;
    player.sendMessage(String(ts));
    if (ts) {
        target.addEffect("poison", 10 * 20, { amplifier: 0, showParticles: true });
        target.addEffect("slowness", 10 * 20, { amplifier: 1, showParticles: true });
        target.addEffect("weakness", 10 * 20, { amplifier: 1, showParticles: true });
        target.applyDamage(5);
        player.addEffect("absorption", 60, { amplifier: 3, showParticles: false });
        player.addEffect("resistance", 40, { amplifier: 3, showParticles: false });
        player.setDynamicProperty("danux:last_launch_ts", undefined);
    } else {
        target.applyDamage(5);
    }
}
import { EffectTypes, Entity, Player } from "@minecraft/server";


export function handleDeathbringer(player: Player): void {
    player.applyKnockback(0, 0, 0, 1.55);
    player.setDynamicProperty("danux:last_launch_ts", Date.now());
}

export function handleDeathbringerAttack(player: Player, target: Entity): void {
    if (!target) return;


    target.addEffect("poison", 5 * 20, { amplifier: 0, showParticles: true });

}
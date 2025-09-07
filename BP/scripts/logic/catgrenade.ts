import { Dimension, Entity, Vector3 } from "@minecraft/server";

export function handleCatGrenade(pos: Vector3, dim: Dimension) {

    for (let i = 0; i < 3; i++) {
        dim.spawnEntity("minecraft:cat", {
            x: pos.x + (Math.random() - 0.5) * 2,
            y: pos.y,
            z: pos.z + (Math.random() - 0.5) * 2
        });
    }
}
import { Block, Dimension, Entity, ExplosionAfterEvent, ExplosionBeforeEvent, ItemStack, Player, system, Vector3, world } from "@minecraft/server";

const aoeMiningGuard = new Set<string>();

function offsetsForSize(size: number) {
    const half = Math.floor(size / 2);     // 6 -> 3
    const arr: number[] = [];
    for (let i = -half; i <= half - 1; i++) arr.push(i); // -3..+2
    return arr;
}

export function handleUltimaPickaxeBreakBlock(block: Block, dim: Dimension, player: Player) {
    const pid = player.id;
    if (aoeMiningGuard.has(pid)) return;
    aoeMiningGuard.add(pid);

    try {
        const offs = offsetsForSize(6);
        const base = block.location;

        const jobs: { x: number; y: number; z: number }[] = [];
        for (const dx of offs) {
            for (const dz of offs) {
                const x = base.x + dx;
                const y = base.y; // immer gleiche Y-Höhe (horizontal)
                const z = base.z + dz;
                if (x === base.x && z === base.z) continue;

                const b = dim.getBlock({ x, y, z });
                if (!b) continue;
                const id = b.typeId;
                if (id === "minecraft:air" || id === "minecraft:water" || id === "minecraft:lava") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:end_portal_frame") continue;

                jobs.push({ x, y, z });
            }
        }

        let i = 0;
        const perTick = 12;
        const handle = system.runInterval(() => {
            for (let n = 0; n < perTick && i < jobs.length; n++, i++) {
                const { x, y, z } = jobs[i];
                player.runCommand(`loot spawn ${x} ${y} ${z} mine ${x} ${y} ${z} mainhand`);
                dim.getBlock({ x, y, z })?.setType("minecraft:air");
            }
            if (i >= jobs.length) system.clearRun(handle);
        }, 1); // <<< fehlte vorher
    } finally {
        aoeMiningGuard.delete(pid);
    }
}

export function handleUltimaPickaxeUse(source: Entity) {
    const dim = source.dimension;
    const start = source.getHeadLocation();

    for (let i = 0; i < 5; i++) {
        // Primed TNT (echter TNT-Block als aktivierte Entity)
        const tnt = dim.spawnEntity("minecraft:tnt", {
            x: start.x,
            y: start.y + 0.2,
            z: start.z
        });
        tnt.setDynamicProperty("danux:spawn_ultima_pickaxe_tnt", true);

        // Nach oben + leichte Streuung
        const up = 0.6 + Math.random() * 0.6;
        const lateral = 0.15;
        const impulse = {
            x: (Math.random() - 0.5) * lateral,
            y: up,
            z: (Math.random() - 0.5) * lateral
        };

        try { (tnt as any).applyImpulse(impulse); }
        catch { try { (tnt as any).setVelocity?.(impulse); } catch { } }
    }
};

export function handleUltimaPickaxeAfterTntExplosion(ev: ExplosionBeforeEvent) {
    const dim = ev.source.dimension;
    const pos = { ...ev.source.location };
    ev.cancel = true;

    system.run(() => {
        if (Math.random() < 0.20) {
            dim.spawnItem(new ItemStack("minecraft:golden_apple", 1), pos);
        }
        dim.spawnItem(new ItemStack("minecraft:netherite_block", 1), pos);
    });
}
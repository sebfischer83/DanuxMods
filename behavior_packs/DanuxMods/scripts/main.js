import { world } from "@minecraft/server";
world.afterEvents.worldInitialize.subscribe(() => {
    world.sendMessage("✅ TS-Setup aktiv!");
});

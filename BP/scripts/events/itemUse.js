import { world } from "@minecraft/server";
import { handleBlinkUse, BLINK_ITEM_ID } from "../logic/blink.js";

export function registerItemEvents() {
  world.afterEvents.itemUse.subscribe(ev => {
    const player = ev.source;
    const item = ev.itemStack;
    if (!player || !item || item.typeId !== BLINK_ITEM_ID) return;
    handleBlinkUse(player);
  });
}

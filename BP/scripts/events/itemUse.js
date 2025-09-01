import { world } from "@minecraft/server";
import { handleBlinkUse, BLINK_ITEM_ID } from "../logic/blink.js";
import { Entity, EntityComponentTypes, EntityInventoryComponent, EquipmentSlot, Player, system } from "@minecraft/server";
import { isHoldingEquipment } from "../utils/equip.js"
import { THUNDERFANG_ID } from "../config.js"
import { attack } from "../logic/thunderfang.js"

export function registerItemEvents() {
  world.afterEvents.itemUse.subscribe(ev => {
    const player = ev.source;
    const item = ev.itemStack;
    if (!player || !item || item.typeId !== BLINK_ITEM_ID) return;
    handleBlinkUse(player);
  });

  world.afterEvents.entityHurt.subscribe(ev => {
    const player = ev.damageSource;
    const target = ev.hurtEntity;

    if (!player)
      return;
    if (!(player.damagingEntity instanceof Player)) return;

    if (player.cause === "entityAttack" && isHoldingEquipment(player.damagingEntity, THUNDERFANG_ID)) {
      attack(target, player.damagingEntity);
    }
  });
}

import { world } from "@minecraft/server";
import { handleBlinkUse, BLINK_ITEM_ID } from "../logic/blink.js";
import { Entity, EntityComponentTypes, EntityInventoryComponent, EquipmentSlot, Player, system, EntityDamageCause } from "@minecraft/server";
import { isHoldingEquipment } from "../utils/equip.js"
import { THUNDERFANG_ID, FLAMETHROWER_ID, DEATHBRINGER_ID } from "../config.js"
import { attack } from "../logic/thunderfang.js"
import { handleFlamethrower } from "../logic/flamethrower.js"
import { handleDeathbringer, handleDeathbringerAttack } from "../logic/deathbringer.js"

export function registerItemEvents() {
  world.afterEvents.itemUse.subscribe(ev => {
    const player = ev.source;
    const item = ev.itemStack;
    if (!player || !item || item.typeId !== BLINK_ITEM_ID) return;
    handleBlinkUse(player);
  });

  world.afterEvents.itemUse.subscribe(ev => {
    if (!ev.source?.isValid) {
      return;
    }

    if (isHoldingEquipment(ev.source, FLAMETHROWER_ID)) {
      handleFlamethrower(ev.source);
    }
    else if (isHoldingEquipment(ev.source, DEATHBRINGER_ID)) {
      handleDeathbringer(ev.source);
    }


  });

  world.beforeEvents.playerBreakBlock.subscribe(ev => {
    if (isHoldingEquipment(ev.source, DEATHBRINGER_ID)) {
      ev.cancel = true;
      return;
    }
  });


  world.afterEvents.entityHurt.subscribe((ev) => {
    const player = ev.damageSource;
    const target = ev.hurtEntity;

    if (!player)
      return;

    if (player.damagingEntity instanceof Player && player.cause === "entityAttack" && isHoldingEquipment(player.damagingEntity, THUNDERFANG_ID)) {
      attack(target, player.damagingEntity);
    }
    if (player.damagingEntity instanceof Player && player.cause === "entityAttack" && isHoldingEquipment(player.damagingEntity, DEATHBRINGER_ID)) {
      handleDeathbringerAttack(player.damagingEntity, target);
    }
  });
}

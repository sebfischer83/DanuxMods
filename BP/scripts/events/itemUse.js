import { world } from "@minecraft/server";
import { handleBlinkUse, BLINK_ITEM_ID } from "../logic/blink.js";
import { Entity, EntityComponentTypes, EntityInventoryComponent, EquipmentSlot, Player, system, EntityDamageCause } from "@minecraft/server";
import { isHoldingEquipment } from "../utils/equip.js"
import { THUNDERFANG_ID, FLAMETHROWER_ID, DEATHBRINGER_ID, CAT_GRENADE_ID, BANHAMMER_ID, ULTIMA_PICKAXE } from "../config.js"
import { attack } from "../logic/thunderfang.js"
import { handleFlamethrower } from "../logic/flamethrower.js"
import { handleDeathbringer, handleDeathbringerAttack } from "../logic/deathbringer.js"
import { handleCatGrenade } from "../logic/catgrenade.js"
import { handleBanhammer } from "../logic/banhammer.js"
import { handleUltimaPickaxeBreakBlock, handleUltimaPickaxeUse, handleUltimaPickaxeAfterTntExplosion } from "../logic/ultimapickaxe.js";

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
    } else if (isHoldingEquipment(ev.source, ULTIMA_PICKAXE)) {
      handleUltimaPickaxeUse(ev.source);
    }


  });

  world.afterEvents.projectileHitBlock.subscribe(ev => {
    console.log(ev.projectile.typeId);
    if (ev.projectile.typeId === CAT_GRENADE_ID) {
      const pos = ev.location; // <- Aufprallposition vom Event nehmen
      const dim =
        ev.source?.dimension ??
        world.getDimension("overworld");
      handleCatGrenade(pos, dim);
    }
  });

  world.afterEvents.projectileHitEntity.subscribe(ev => {
    console.log(ev.projectile.typeId);
    if (ev.projectile.typeId === CAT_GRENADE_ID) {
      const pos = ev.location; // <- ebenfalls vom Event
      const dim =
        ev.entity?.dimension ??
        ev.source?.dimension ??
        world.getDimension("overworld");
      handleCatGrenade(pos, dim);
    }
  });

  world.beforeEvents.playerBreakBlock.subscribe(ev => {
    if (isHoldingEquipment(ev.player, DEATHBRINGER_ID)) {
      ev.cancel = true;
      return;
    }


  });

  world.afterEvents.playerBreakBlock.subscribe(ev => {
    if (isHoldingEquipment(ev.player, ULTIMA_PICKAXE)) {
      handleUltimaPickaxeBreakBlock(ev.block, ev.dimension, ev.player);
    }
  });


  world.beforeEvents.explosion.subscribe(ev => {
    if (ev.source?.typeId === "minecraft:tnt") {
      const isUltima = ev.source.getDynamicProperty("danux:spawn_ultima_pickaxe_tnt") === true;

      if (!isUltima) return;
      handleUltimaPickaxeAfterTntExplosion(ev);
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
    if (player.damagingEntity instanceof Player && player.cause === "entityAttack" && isHoldingEquipment(player.damagingEntity, BANHAMMER_ID)) {
      handleBanhammer(player.damagingEntity, target);
    }
  });
}

import { Entity, EntityComponentTypes, EntityInventoryComponent, EntityEquippableComponent, EquipmentSlot, Player } from "@minecraft/server";

export function isHoldingEquipment(p: Entity, what: string): boolean {

    const eq = p.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
    if (!eq) return false;

    const mainhand = eq.getEquipmentSlot(EquipmentSlot.Mainhand);

    return !!mainhand && mainhand.typeId === what;
}
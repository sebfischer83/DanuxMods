// Keine BlockLocation – wir nutzen Plain-Objekte wie in deiner Datei
import { floor } from "./vector.js";

export function isPassable(block) {
  if (!block) return false;
  if (block.isAir) return true;
  const id = block.typeId || "";
  return (
    id.includes("grass") || id.includes("fern") || id.includes("flower") ||
    id.includes("mushroom") || id.includes("sapling") || id.includes("carpet") ||
    id.includes("snow_layer") || id.includes("vine")
  );
}
export function isSolidFloor(block) {
  if (!block) return false;
  const id = block.typeId || "";
  if (block.isAir) return false;
  if (id.includes("water") || id.includes("lava")) return false;
  return true;
}
export function isSafeStand(dim, pos) {
  const feet = floor(pos);
  const head = { x: feet.x, y: feet.y + 1, z: feet.z };
  const below = { x: feet.x, y: feet.y - 1, z: feet.z };
  const bFeet = dim.getBlock(feet);
  const bHead = dim.getBlock(head);
  const bBelow = dim.getBlock(below);
  return isPassable(bFeet) && isPassable(bHead) && isSolidFloor(bBelow);
}

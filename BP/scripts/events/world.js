import {
  world,
  system,
  Player
} from "@minecraft/server";

// 1:1 dieselben Events wie in deiner Datei
export function registerWorldEvents() {
  world.afterEvents.worldLoad.subscribe(() => {
    try {
      world.sendMessage("✅ Mein Script läuft! Willkommen in der Welt!");
      console.warn("✅ Weltinitialisierung erfolgreich!");
    } catch (error) {
      console.error("❌ Fehler bei Weltinitialisierung:", error);
    }
  });

  world.afterEvents.playerSpawn.subscribe((event) => {
    try {
      const player = event.player;
      // Kurze Verzögerung, damit der Spieler die Welt vollständig geladen hat
      system.runTimeout(() => {
        player.sendMessage("§a✅ Willkommen! Das Addon ist aktiv!");
        player.sendMessage("§b🔧 Script Version 1.0 geladen");
        player.sendMessage("§e⚔️ Teste das Ultima Sword!");
      }, 20); // 1 Sekunde Verzögerung
      console.warn(`✅ Spieler ${player.name} ist gespawnt`);
    } catch (error) {
      console.error("❌ Fehler beim Spieler-Spawn:", error);
    }
  });
}

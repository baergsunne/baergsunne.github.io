# Bärgsunne Poker v1.3.0 – A umgesetzt, B vorbereitet

**Website:** https://baergsunne.github.io/
**Quelle:** `baergsunne/baergsunne.github.io` – vollständig getrennt von ZFF Media.

## v1.3: Abschnitt A
- Spielerlegenden als **separate, umbrechende farbige Buttons**, mit Tap zum Ein-/Ausblenden einer Reihe.
- Diagrammfarben nach Spieleridentität konsistent statt nur nach Sortierposition.
- Jahres-Mehrfachauswahl wie Spielerauswahl (2010–2025), kombiniert anwendbar.
- Stärkere grün-goldene Verläufe, zentrierte und grössere Startseiten-Kacheln.
- Bestehende Champion-Karten, Champions-Mehrfachsieger und Links beibehalten.
- Live-Titel Bärgsunne Poker 2026, keine freie öffentliche Rundenerfassung.
- Sichtbares `VERSION 1.3.0` für klare iPhone-Abnahme.

**WICHTIG:** Lokal technische Tests bestanden; Veröffentlichung und iPhone-Abnahme stehen aus. Alle Daten von 2010–2025 sind simuliert.

## Abschnitt B – getrenntes sicheres Backend
`admin.html`/`admin.js` sind vorbereitet. `backend-config.js` enthält **keine API-Adresse** und **keine Geheimnisse**. Solange der isolierte Cloudflare Worker/D1 nicht eingerichtet ist, sind die Administration und die Live-Synchronisierung **nicht aktiviert**.

Das Backend (`Backend-Paket` separat) umfasst serverseitige Zugangskontrolle, PBKDF2-Passwortprüfung, Login-Drosselung, 8-Stunden-Sitzungen, mehrere Admin-Konten, Rundenänderungen, Historienarchiv, Änderungsprotokoll. Für die produktive Verwendung sind neue D1/Worker-Ressourcen, Secrets und Tests nötig.

## Hochladen am iPhone
Öffne auf Safari https://github.com/baergsunne/baergsunne.github.io und dann **Add file → Upload files**. Lade alle Dateien aus dem **öffentlichen Update-ZIP** in das **Root-Verzeichnis** des Repositories hoch (nicht den ZIP-Ordner). Gleichnamige Dateien ersetzen, **Commit directly to main**. Nicht vorher löschen. Nach dem Deployment unter https://baergsunne.github.io/?v=1.3.0 die Versionsanzeige prüfen.

**Keine Mac-/PC-Schritte, keine Änderungen an ZFF Media, keine kostenpflichtigen Komponenten.**

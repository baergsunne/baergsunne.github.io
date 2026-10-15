# Bärgsunne Poker Live — isolierter Implementierungsstand

Basis: Work-06-Branch `ce0b0b4e6f5804a8c3297f280de1de00aa274b89`. Dieser Entwicklungsbranch verändert `main`, GitHub Pages und das Cloudflare-Konto nicht.

## Daten und Regeln

- `data.js` und `historische-ergebnisse.json` (2007–2025) bleiben bytegleich.
- Die 2026-Konfiguration startet mit zehn Spielern, acht Runden und 10/8/6/5/4/3/2/1/0/0; der Owner kann vor dem ersten Entwurf Namen, Rundenzahl und Punkte mobil ändern.
- Jeder Entwurf, jede Veröffentlichung, Rücknahme und Korrektur erhöht die Revision. Eine D1-Triggerzeile protokolliert den vorherigen und neuen Turnierzustand. Veraltete Bearbeitungen liefern HTTP 409.
- Die öffentliche API liefert nur veröffentlichte Runden. Eine Korrektur erfolgt durch erneutes Veröffentlichen der vollständigen Runde; bei späteren Runden muss eine Rücknahme von hinten nach vorne erfolgen.
- Die definitive Rangfolge sortiert nach Punkten, danach Rundensiegen, danach Namen. Der Owner bestätigt die gesamte Schlussrangliste vor Abschluss. Diese Tie-Break-Regel muss vor dem ersten offiziellen Turnier vom Owner fachlich geprüft werden.
- Nach Abschluss ist die Saison schreibgeschützt und wird als zusätzliche Ausgabe über `/api/editions` in die Website eingeblendet; die Originaldateien bleiben unverändert. Zukünftige Turniere werden im Admin über eine neue Jahreszahl angelegt. Die öffentliche Ansicht wählt automatisch das jüngste aktive Turnier, sonst das jüngste abgeschlossene.
- Während des Turniers zeigt die Live-Seite Spielerprofile und laufende Bestwerte nur aus veröffentlichten Runden. Historische Titel/Rekorde werden erst nach finaler Bestätigung um die Saison erweitert.
- Der Simulator importiert veröffentlichte Runden als lokal gesperrte Vorlage und vervollständigt die übrigen Runden auf dem Gerät; keine Simulatorroute schreibt in D1.

## Sicherheit

Einmalige Owner-Einrichtung: Ein langer, zufälliger `PREVIEW_GATE_SECRET` wird nach Freigabe als Cloudflare-Secret gesetzt und auf dem iPhone in `/setup.html` eingegeben; dort wählt der Owner selbst sein Admin-Passwort (mindestens 14 Zeichen). Das Passwort erscheint nie im Chat oder Quellcode. PBKDF2-SHA256 mit individuellem Salt; Sessions als gehashte Bearer-Tokens in D1, acht Stunden gültig, beim Logout widerrufen. Bearer-Token nur im Browserspeicher, nie in localStorage. Schreibwege prüfen Origin und Revision. Fünf Fehlversuche sperren eine IP für 15 Minuten. Vor der Einrichtung schützt das Vorschau-Gate auch statische Seiten und lesende APIs; der Vorschaucode wird per Secure/HttpOnly/SameSite-Cookie nur für den laufenden Tag bestätigt.

Der Vorschaucode soll mindestens 24 zufällige Zeichen haben und vom Owner direkt auf dem iPhone in Cloudflare gesetzt werden. Nur der Owner gibt ihn dort und auf der Vorschauseite ein. Eine spätere öffentliche Freigabe benötigt einen separaten geprüften Deploy-/Cutover-Schritt; den Vorschau-Worker nicht durch Löschen des Gates öffentlich schalten, solange die Abnahme fehlt.

## Freigabegate und Betriebsweg

**Noch nicht ausgeführt:** neue D1 `baergsunne-live-private-preview` und Worker `baergsunne-live-private-preview` im ausschliesslich verbundenen Konto `p.sch2@gmx.ch` (Account-ID `146645dd85e8e16115082d2f10f1bf46`), Migration, Secret, Deployment. Die Datei `wrangler.live.example.toml` enthält absichtlich keine echte D1-ID oder Secrets. Keine Ressource anlegen, bevor der Owner dies ausdrücklich freigibt.

Nach Freigabe: Ressourcen nur im genannten Konto erstellen; D1-Migration `live/migrations/0001_initial.sql` einmalig ausführen; Asset-Build `npm run build:live`; Vorschau-Gate-Secret durch Owner sicher eintragen; Worker samt statischen Assets isoliert bereitstellen. Die Admin-URL und Login-/Setup-Flows sind vollständig mobil. Der Agent sollte Remote-GETs und iPhone-Safari-Abnahme mit dem Owner durchführen, bevor die eigentliche öffentliche Website geändert wird. Die vorhandene `main`/GitHub-Pages-Seite bleibt während der Vorschau unverändert.

Cloudflare Free-Limits können den Dienst bei sehr hohem Traffic vorübergehend stoppen; es ist keine automatische Umstellung auf einen kostenpflichtigen Plan vorgesehen. Der öffentliche Poll-Intervall beträgt 15 Sekunden pro aktivem Browser. Für Betriebsreife sind ferner Remote-Tests, Backup/Recovery und eine echte Safari-Abnahme erforderlich.

## Lokal

`npm test` prüft Backend-Übergänge, Sicherheitsnegativfälle, 2027, historische Unverändertheit und die bestehenden UI-/Rekordtests. `npm run build:live` baut nur für die isolierte Vorschau in `dist-live/` (gitignored). Eine visuelle Browserabnahme war mangels Chromium-Binary in dieser Laufzeit nicht möglich.

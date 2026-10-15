# Bärgsunne Poker Live — isolierter Implementierungsstand

Basis: Work-06-Branch `ce0b0b4e6f5804a8c3297f280de1de00aa274b89`. Dieser Entwicklungsbranch verändert `main`, GitHub Pages und das Cloudflare-Konto nicht.

## Daten und Regeln

- `data.js` und `historische-ergebnisse.json` (2007–2025) bleiben bytegleich.
- Die 2026-Konfiguration startet mit zehn Spielern, acht Runden und 10/8/6/5/4/3/2/1/0/0; der Owner kann vor dem ersten Entwurf Namen, Rundenzahl und Punkte mobil ändern.
- Jeder Entwurf, jede Veröffentlichung, Rücknahme und Korrektur erhöht die Revision. Eine D1-Triggerzeile protokolliert den vorherigen und neuen Turnierzustand. Veraltete Bearbeitungen liefern HTTP 409.
- Die öffentliche API liefert nur veröffentlichte Runden. Eine Korrektur erfolgt durch erneutes Veröffentlichen der vollständigen Runde; bei späteren Runden muss eine Rücknahme von hinten nach vorne erfolgen.
- Die definitive Rangfolge sortiert nach Punkten, danach Rundensiegen, danach Namen. Diese Tie-Break-Regel wurde vom Owner bestätigt. Der Owner bestätigt die gesamte Schlussrangliste vor Abschluss.
- Nach Abschluss ist die Saison schreibgeschützt und wird als zusätzliche Ausgabe über `/api/editions` in die Website eingeblendet; die Originaldateien bleiben unverändert. Zukünftige Turniere werden im Admin über eine neue Jahreszahl angelegt. Die öffentliche Ansicht wählt automatisch das jüngste aktive Turnier, sonst das jüngste abgeschlossene.
- Während des Turniers zeigt die Live-Seite Spielerprofile und laufende Bestwerte nur aus veröffentlichten Runden. Historische Titel/Rekorde werden erst nach finaler Bestätigung um die Saison erweitert.
- Der Simulator importiert veröffentlichte Runden als lokal gesperrte Vorlage und vervollständigt die übrigen Runden auf dem Gerät; keine Simulatorroute schreibt in D1.

## Sicherheit

Einmalige Owner-Einrichtung: Ein langer, zufälliger `PREVIEW_GATE_SECRET` wird nach Freigabe als Cloudflare-Secret gesetzt und auf dem iPhone in `/setup.html` eingegeben; dort wählt der Owner selbst sein Admin-Passwort (mindestens 14 Zeichen). Das Passwort erscheint nie im Chat oder Quellcode. PBKDF2-SHA256 mit individuellem Salt, 100 000 Durchläufen (Cloudflare-Produktionsgrenze) und serverseitigem `RATE_SALT` als zusätzlichem Pepper; Sessions als gehashte Bearer-Tokens in D1, acht Stunden gültig, beim Logout widerrufen. Bearer-Token nur im Browserspeicher, nie in localStorage. Schreibwege prüfen Origin und Revision. Fünf Fehlversuche sperren eine IP für 15 Minuten. Vor der Einrichtung schützt das Vorschau-Gate auch statische Seiten und lesende APIs; der Vorschaucode wird per Secure/HttpOnly/SameSite-Cookie nur für den laufenden Tag bestätigt.

Der zufällige Vorschaucode wurde als Cloudflare-Secret gesetzt und separat privat bereitgestellt. Der Owner gibt ihn auf der Vorschauseite und bei der einmaligen Einrichtung ein; das Admin-Passwort wählt er ausschliesslich selbst auf dem iPhone. Bei fehlendem Secret versagt das Gate geschlossen. Eine spätere öffentliche Freigabe benötigt einen separaten geprüften Deploy-/Cutover-Schritt; den Vorschau-Worker nicht durch Löschen des Gates öffentlich schalten, solange die Abnahme fehlt.

## Freigabegate und Betriebsweg

Nach ausdrücklicher Freigabe eingerichtet: D1 `baergsunne-live-private-preview` (`c5618626-e0d0-461f-99e9-e9d1c3816435`, EU) und Worker `baergsunne-live-private-preview` im Konto `p.sch2@gmx.ch` (Account-ID `146645dd85e8e16115082d2f10f1bf46`), Schema, D1-Bindung, Preview-Gate- und Rate-Limit-Secrets. Die Datei `wrangler.live.example.toml` enthält absichtlich keine Secrets. Weder `main` noch die öffentliche GitHub-Pages-Seite wurden verändert.

Die isolierte Worker-Adresse ist `https://baergsunne-live-private-preview.baergsunne-poker-2026.workers.dev/`. Die Admin-URL und Login-/Setup-Flows sind vollständig mobil. `npm run build:preview` erzeugt das identische, nur für die Vorschau bestimmte Einzelmodul mit eingebetteten Text- und SVG-Assets; die drei bereits auf der bestehenden Website vorhandenen WebP-Dateien werden von deren unveränderter Adresse geladen. Die fünf verworfenen Hero-Bilder sind nicht enthalten. Der nach iPhone-Setup und Admin-Revisionskorrektur auf der privaten Vorschau aktivierte Modul-SHA-256 ist `ccde4527583197d9edd29726be4d17586ea95f44dd56fc89bb34c5a83772bbb6`. Der Owner hat Setup, Veröffentlichung und Rücknahme von Runde 1 auf Safari bestätigt; Runde 2 wurde als Entwurf gesichert, die Veröffentlichung steht noch aus. Doppelte Aktionen werden in der Admin-Oberfläche abgefangen; bei einer fremden Revision lädt sie den aktuellen Stand und fordert eine erneute Prüfung der Platzierungen. Keine öffentliche Freigabe vor einer vollständigen End-to-End-Prüfung.

Cloudflare Free-Limits können den Dienst bei sehr hohem Traffic vorübergehend stoppen; es ist keine automatische Umstellung auf einen kostenpflichtigen Plan vorgesehen. Der öffentliche Poll-Intervall beträgt 15 Sekunden pro aktivem Browser. Für Betriebsreife sind ferner Remote-Tests, Backup/Recovery und eine echte Safari-Abnahme erforderlich.

## Lokal

`npm test` prüft Backend-Übergänge, Sicherheitsnegativfälle, 2027, historische Unverändertheit und die bestehenden UI-/Rekordtests. `npm run build:live` baut nur für die isolierte Vorschau in `dist-live/` (gitignored). Eine visuelle Browserabnahme war mangels Chromium-Binary in dieser Laufzeit nicht möglich.

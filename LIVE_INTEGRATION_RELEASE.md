# Bärgsunne Poker · integrierter Release-Kandidat (15.10.2026)

## Geltungsbereich

Branch `work/full-integration-20261015` basiert auf dem aktuellen öffentlichen `main` bei `9a0d87daa1750aaf026a45de89eb9dfff0e6a329` und integriert den erprobten Live-Branch. `data.js` und `historische-ergebnisse.json` 2007–2025 sind bytegleich zu `main`. Die fünf abgelehnten Hero-Bilder sind nicht enthalten. Die vorhandenen drei WebP-Motive bleiben.

## Funktionen

- 25 freigegebene SVG-Dateien aus `assets/icons` werden für Navigation, Filter und Statistik-Werkzeuge verwendet.
- 13 Statistik-Werkzeuge einschliesslich Analyse-Studio behalten die unabhängigen Jahr-/Spielerauswahlen; `TOOL_CHOICES` ist wieder initialisiert. Fehlende Werkzeuge werfen keine ungeschützte Navigationsausnahme.
- Gemeinsame Darstellung für Statistik- und Geschichtstabellen, Live-Rangliste und Championship Live; breite Tabellen bleiben horizontal per Finger wischbar. Admin-Rangliste besitzt echte Zellen.
- Championship Live zeigt den veröffentlichten Tabellenstand, Titelrennen als gekennzeichnete Obergrenze, Rundenchronik, Punkteverlauf, Formkurve und Führung. Trendvergleiche verwenden Punkte, Rundensiege und Namen.
- Privater Worker/D1 führt Anmeldung, Entwurf, Publikation, Korrektur, Rücknahme, Revision, Audit, Abschluss und historische Archivübernahme aus. Browser-Simulation schreibt keine Resultate.
- GitHub Pages darf veröffentlichte GET-Daten vom Produktions-Worker lesen. Admin-Login und sämtliche Schreibwege laufen unter dessen eigener HTTPS-Adresse und prüfen die Herkunft. Die statische Admin-Seite leitet bei Produktionskonfiguration dorthin um.

## Grenzen der Freigabe

`main`, GitHub Pages und produktive Cloudflare-Zugriffsregeln wurden nicht geändert. Der private Worker bleibt durch `PREVIEW_REQUIRED=true` und ein nicht im Code enthaltenes Geheimnis geschützt. Seine D1 enthält einen früheren Probelauf mit einer publizierten Runde 1 und Entwürfen; diese Daten werden nie in die neue Produktionsdatenbank kopiert.

Für Produktion sind nach ausdrücklicher Owner-Freigabe ein eigener Worker und eine eigene D1 im Konto `p.sch2@gmx.ch` vorgesehen. Die Produktionsdatenbank beginnt ohne offizielle Testresultate. Der Owner gibt sein bestehendes Passwort auf dem iPhone in der geschützten Einrichtung erneut ein, damit es mit einem frischen Produktions-Pepper abgeleitet wird. Weder Passwort noch Pepper werden exportiert oder in GitHub geschrieben. Danach wird die öffentliche GitHub-Pages-Konfiguration auf den Produktions-Worker gesetzt und der geprüfte Branch in `main` veröffentlicht. Die private Vorschau bleibt eigenständig.

## Prüfpfad

`npm test` und `npm run build:preview`. Der private Worker enthält dieselben 66 eingebetteten Text- und SVG-Assets; die drei bereits öffentlichen WebP-Dateien werden separat gelesen. Ein öffentlicher Cutover erfordert eine neue Browserprüfung der Produktions-URL, der CORS-Antworten, des iPhone-Layouts, des Login-Flows und der leeren 2026-Tabelle vor der ersten offiziellen Runde.

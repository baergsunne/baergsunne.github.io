# Bärgsunne Poker – Profi-Blinds-Timer (Entwicklungsstand 21.10.2026)

## Unveränderliche Produktstruktur

Es gibt genau **zwei Timer**:

- **Öffentlicher Privat-Timer:** vereinfachte Standardeinstellungen, über Startseite und Navigation; ausschliesslich lokal auf einem Gerät, ohne QR-Code oder Zugriff auf Bärgsunne-Turnierdaten.
- **Geschützter Administrator-Profi-Timer:** Travis-inspirierte Turnierzentrale. Beim Erstellen eines Turniers wählt nur der Administrator mit einem Klick zwischen **Bärgsunne-Runde** und **Freies Turnier**. Die Wahl wird nach dem Erstellen nicht mehr geändert. Offizielle Ergebnisse dürfen erst nach einer gesonderten Bestätigung veröffentlicht werden.

Die Zuschauer beider Profi-Modi verwenden eine separate, neutrale, schreibgeschützte Webansicht mit fünf Bereichen (Timer, Spieler, Blindstruktur, Chips, Verlauf), nicht die Bärgsunne-Website. Kein Zuschauer kann ein Turnier eröffnen oder steuern.

## Neue Implementierung im isolierten Branch

Branch: `feature/profi-timer-zwei-betriebsarten-20261021`

- `profi-live-admin.html`, `profi-live-admin.js`: geschützte Turnierzentrale mit bestehender Administratoranmeldung; offizielle Runde oder freies Turnier erstellen, Timer bedienen, Spieler ausscheiden lassen, Rebuys und Add-ons verbuchen, Ereignisse rückgängig machen, Ergebnisse prüfen.
- `live/profi-core.js`: prüfbare Clock-/Event-/Platzierungslogik. Die Uhr wird über serverseitig berechnete Zeitstempel rekonstruiert, auch wenn der Browser zwischenzeitlich geschlossen war.
- `live/profi-api.js`: neue serverseitige API mit D1-Revisionen und CAS, Admin-Authentifizierung, serverseitiger Prüfung offizieller Runden, rein lesenden Zuschauerzugriffen und widerrufbaren HMAC-signierten Zuschauer-URLs.
- `live/migrations/0002_profi_sessions.sql`: **eigene Timer-Tabelle** ohne Änderung an bestehenden Runden oder historischen Ergebnissen. Das neue Schema muss vor einer künftigen Freigabe auf einer isolierten D1 getestet und installiert werden.
- `watch.html`, `watch.js`: neutrale Zuschaueroberfläche mit fünf Bereichen. Der Sekunden-Countdown erfolgt lokal; der Stand wird derzeit alle 30 Sekunden oder beim erneuten Öffnen abgeglichen. Kein sekündliches HTTP-Polling.
- `profi-qr.js`: QR-Code wird **vollständig lokal** erstellt, ohne Zuschauer-Token an einen Drittanbieter zu übertragen. Der QR-Algorithmus (QR v9-L) wurde zusätzlich mit einem lokal erzeugten QR-Bild und unabhängigem QR-Leser getestet.
- `admin.html`: Link innerhalb des bereits geschützten Admin-Panels. Kein öffentlicher Link auf der Bärgsunne-Startseite hinzugefügt.
- `live/worker.js`: API-Route und schreibgeschützter, mit Schlüssel geschützter Zugriff; das Vorschau-Gate bleibt für andere Seiten bestehen.
- `live/build.mjs`, `live/build-preview-embedded.mjs`: neue Oberflächen und API im isolierten Worker-Vorschau-Build berücksichtigt.
- `live/profi.test.js`, `tests/profi-timer-demo.cjs`, `.github/workflows/profi-timer-ci.yml`: automatische Tests und CI.

## Offizielle Turnierdaten bleiben geschützt

Eine offizielle Runde kann nur angelegt werden, wenn im bestehenden Adminsystem ein nicht abgeschlossener Jahrgang und eine noch nicht veröffentlichte Runde existieren. Der Timer übernimmt die vorhandene Spielerliste, nicht freie Eingaben. Die Platzierung ergibt sich erst nach dem tatsächlichen Finale; Rebuys entfernen die vorangegangene Ausscheidung aus der endgültigen Rangfolge.

Die Aktion „Als offiziellen Entwurf übernehmen“ schreibt ausschliesslich in die **bestehende revisionsgeschützte, auditierte Entwurfspipeline**. Sie veröffentlicht **keine** Punkte oder Rundenranglisten. Die Bestätigung „Prüfen und veröffentlichen“ in der vorhandenen Administration bleibt zwingend. Der bereits abgeschlossene Jahrgang 2026 darf nicht erneut gestartet oder bearbeitet werden.

Der freie Profi-Modus nutzt ausschliesslich `profi_sessions` und kann nicht in die Meisterschaftsresultate schreiben.

## Tatsächlich geprüfter Stand

GitHub Actions: **Profi-Timer Isolated CI erfolgreich** (21.10.2026). Geprüft:
- Syntax aller geänderten/neuen Programme
- professionelle Backend-API mit echter SQLite-Testdatenbank, Anmeldung, Zuschauer-Token, 403/410, Widerruf, Revision, offizieller Entwurfübergabe
- bisherige Meisterschafts-Backendtests
- alte Profi-Demo-Smoke-Checks und Live-Push-Sicherheitsprüfungen
- vollständiger Build der statischen Assets und des Worker-Vorschaumoduls

Es wurde **weder `main` verändert noch öffentlich bereitgestellt**, keine produktive Cloudflare-Datenbank migriert und kein historisches Spielergebnis verändert.

## Offene Schritte, ausdrücklich NICHT als fertig behaupten

1. **Eine reale, isolierte HTTPS-Vorschau fehlt noch.** Die Cloudflare-Verbindung schlug während des Durchlaufs wiederholt fehl. Es gibt keinen verifizierten Link für diesen Entwicklungsstand.
2. Die Anzeige verwendet vorläufig 30-Sekunden-Abgleich, **kein produktives ereignisgesteuertes Live-Push/WebSocket-System**. Ein optionaler Broadcast-Hook ist vorbereitet, aber nicht angebunden.
3. Administrator-/Zuschauer-Browsertests auf iPhone, iPad und Desktop sowie ein realer QR-Scan auf dem Zielgerät fehlen noch; QR wurde unabhängig am QR-Testbild dekodiert.
4. Chipstack/Blind Calculator, Rebuy-Zeitfenster, Auszahlungsregeln, Wettbewerbsregeln und detaillierte Travis-Parität müssen vor Freigabe erweitert und überprüft werden.
5. CHF-0.-Grenze ist zwingend: Cloudflare-Konto-/Billing-/Free-Kontingente sind nicht überprüfbar, darum keine Deployment-Freigabe und keine kostenpflichtigen Ressourcen.
6. Neutrale Zuschaueroberfläche ist umgesetzt, aber die workers.dev-Domain kann weiterhin den Bärgsunne-Kontonamen verraten. Vor öffentlicher Nutzung eine kostenlose neutrale Adresse prüfen.

## Als Nächstes

Cloudflare-Anbindung wiederherstellen, isolierte Preview-D1 mit Migration (ohne produktive Ergebnisse) vorbereiten, separaten Preview-Worker mit sicheren Secrets betreiben, Admin- und QR-End-to-End-Test auf realen Geräten, dann eventgesteuerte Aktualisierung und Last-/Kostentest. Erst nach eigener ausdrücklicher Freigabe in die öffentliche Website übernehmen.

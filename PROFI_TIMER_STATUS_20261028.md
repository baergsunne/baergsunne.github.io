# Bärgsunne Profi-Timer – Entwicklungsvorschau 28. Oktober 2026

Dieser neue Branch `feature/profi-timer-preview-main-20261028` wurde direkt von `main` (87122dd00ec495d1af61ba6f79386ceb2add0e20) erstellt. Keine Übernahme einer älteren Website-Version. Die 16 isolierten Timer-Dateien stammen aus dem zuvor in GitHub Actions getesteten Feature-Branch. Lediglich geschützte Admin- und Live-Worker-Einstiege, D1-Entwicklungsschema, Builds und Testworkflow wurden auf dem neuesten Hauptstand ergänzt.

## Fixe Architektur
- Zwei Timer: (1) offizieller geschützter Administrator-Profi-Timer mit Ein-Klick-Auswahl Bärgsunne-Runde oder Freies Turnier, (2) separat zu entwickelnder öffentlicher einfacher lokaler Privat-Timer.
- Im Bärgsunne-Modus werden Spieler vom offiziellen Server geladen und Ergebnisse nur als revisionskontrollierter Entwurf gespeichert. Publikation bleibt eine gesonderte Admin-Bestätigung. Der freie Modus berührt keine offiziellen Ergebnisse.
- QR-Zuschaueransicht neutral, nur lesend. Serverauthentifizierung, HMAC-Tickets, widerrufbare Sitzungen, Push optional, lokaler Countdown.
- Die veröffentlichte Website und alle bestehenden Produktions-Cloudflare-Daten bleiben unberührt.

## Bereitstellung
Am 28. Oktober 2026 funktioniert der Cloudflare-Connector zum richtigen Bärgsunne-Konto wieder. Vorhandene Worker und D1 sind inventarisiert. Billing-Read über die vorhandene OAuth-Verbindung verweigert mit HTTP 403, deshalb ist die verbindliche CHF-0.-Kostenprüfung **nicht erfolgreich nachgewiesen**. Es wurde deshalb kein Worker/D1 neu angelegt und keine Bereitstellung veranlasst. Vorschau benötigt eigene D1, eigene Secrets, Free-Plan-Prüfung und danach Mobilgeräte- und QR-Live-Test.

## Teststatus
GitHub Actions Workflow auf dem neuen Branch ausführen. Frühere Tests und Chromium-QA wurden auf dem alten Branch erfolgreich ausgeführt, gelten jedoch ausdrücklich nicht als Testbestätigung dieser aktuellen Integrationsversion.


## Separates Cloudflare-Preview erfolgreich bereitgestellt – 28.10.2026

Der Nutzer hat im Cloudflare-Dashboard den Tarif **Workers Free** bestätigt. Das richtige Bärgsunne-Cloudflare-Konto ist `p.sch2@gmx.ch`. Am 28.10.2026 wurden ausschliesslich folgende Ressourcen NEU angelegt:
- Worker `baergsunne-profi-timer-preview-20261028` mit deaktivierten Versionspreviews; nur für private Abnahme, nicht die öffentliche Website.
- D1 `baergsunne-profi-timer-preview-20261028` (UUID `94eb187e-67dd-4613-a882-7e049056fc8f`), mit eigenem Schema und keinem Zugriff auf die produktiven DBs.
- Bindings: eigene D1, `PREVIEW_REQUIRED=true`, eigene Geheimnisse `PREVIEW_GATE_SECRET`, `RATE_SALT`, `PROFI_VIEWER_SECRET`. Die Geheimnisse stehen **nicht** im Repository.
- Kein Durable-Object-Binding im ersten isolierten Release; die Zuschaueransicht verwendet 30-Sekunden-Abgleich, Uhrzeit/Blindwechsel laufen lokal.
- Testjahrgang 2027 mit zehn ausdrücklichen fiktiven Namen `Testspieler 1` bis `Testspieler 10`. Keine originalen Bärgsunne-Spielerdaten oder Resultate übernommen.

Private URL (vor dem Admin-Login mit täglicher Vorschaucode-Sperre):
`https://baergsunne-profi-timer-preview-20261028.baergsunne-poker-2026.workers.dev/`

Administrator des **Testsystems** muss über `/setup.html` einmalig einen separaten Benutzernamen und ein persönliches Passwort festlegen (Passwort mindestens 14 Zeichen). Das Vorschaugeheimnis wird sicher nur als Worker Secret gehalten. Die Einrichtung darf keinesfalls mit der produktiven Bärgsunne-Administration verwechselt werden.

GitHub Actions Live-Smoke: `40611015221` **grün**. Es wurde extern geprüft: Ohne Vorschaucookie HTTP 401 mit Vorschau-Anmeldeseite; die neutrale Zuschaueransicht, das Zuschauer-JS und Blind-Uhrmodul HTTP 200; ungültiger Zuschauer-Token HTTP 403. Die geschützte Administrator-Seite ist ebenfalls HTTP 401. GitHub Integrations-/Browsertests auf dem Branch zuletzt `40610849525` erfolgreich; nachfolgende Regressionsläufe laufen weiterhin.

**Noch keine Abnahme** des echten eingeloggten Test-Admins, der finalen Rundenergebnis-Übergabe und der Live-Zuschauerverbindung zwischen mehreren iPhones. Diese folgen erst nach nutzerseitiger Einrichtung und Tests. Kostenlimite: Free-Tarif ist vom Nutzer bestätigt; OAuth Billing Read ist weiterhin nicht erteilt. Keine gebührenpflichtigen Ressourcen verwendet.


## 11. November 2026 – Ohne Vorschaucode und ohne Login testbar

Auf ausdrücklichen Wunsch wurde der isolierte Cloudflare-Testworker `baergsunne-profi-timer-preview-20261028` auf eine **frei erreichbare, aber vollständig fiktive Demo** umgestellt. Direkter Einstieg:

`https://baergsunne-profi-timer-preview-20261028.baergsunne-poker-2026.workers.dev/profi-demo.html`

- `profi-demo.html` und `profi-demo.js` sind ohne Vorschaupasswort und ohne Administratoranmeldung aufrufbar. Auch die Root-Adresse leitet dorthin.
- Betriebsarten: Bärgsunne-Runde nur mit **zehn synthetischen Spielern im Demojahr 2027** und Freies Turnier mit benutzerdefinierten Testspielern.
- Vollständige operative Demo mit Start/Pause/Blindwechsel, Ausscheiden/Rebuy/Add-on/Undo, Chipübersicht, neutraler QR-Zuschaueransicht und **nicht-speicherbarem, niemals veröffentlichtem Ergebnisentwurf**.
- Neu: `live/profi-demo-api.js`, D1-Migration `0003_profi_demo.sql`, Tabellen `profi_demo_sessions` und `profi_demo_limits` auf ausschliesslich isolierter D1. Pro Browser wird eine nicht-ratbare, zeitlich begrenzte Operator-Berechtigung erstellt und lokal gespeichert. Zuschauer-Links sind HMAC-signiert, nur lesend und widerrufbar. Die Demo läuft 90 Minuten; maximale gleichzeitige Sitzungen und Tageslimits schützen das Workers-Free-Kontingent.
- Worker-Binding `DEMO_ONLY=true`: **sämtliche realen Admin-, Anmelde-, Publikations- und Meisterschafts-APIs geben HTTP 403 zurück**. Nur Demo- und autorisierte Zuschauer-APIs bleiben aktiv. Die vorherige Vorschaucode-Sperre bleibt als Secret intern vorhanden, ist für die Demo jedoch nicht erforderlich.
- Diese Demo hat keine Verknüpfung zur produktiven Bärgsunne-Website und zur offiziellen D1. `main`, Historie, Ranglisten und deren Freigaben bleiben unverändert.
- Cloudflare-Worker-Upload und Bindings verifiziert, neue D1-Tabellen geprüft. **Externe GitHub-Actions-HTTP-E2E-Prüfungen des neuen No-Login-Modus sind am 11.11.2026 noch in Warteschlange.** Daher keine Behauptung über bereits bestandene reale Smartphone-Mehrgerätetests. Ein Nutzer kann die HTTPS-Testseite sofort eigenständig öffnen und bedienen.

Die ältere Dokumentation weiter oben beschreibt den *damaligen* passwortgeschützten Stand vom Oktober und ist für die aktuelle öffentliche Demo nicht mehr die Bedienanleitung. Die produktive Administrationsarchitektur bleibt getrennt.

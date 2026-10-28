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

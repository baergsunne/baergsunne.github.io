# Bärgsunne Poker – Profi-Timer (Entwicklungsstand vom 21.10.2026)

## Verbindliche Produktstruktur

**Es gibt exakt zwei Timer:**
1. Öffentlicher, einfacher Privat-Timer. Jeder darf ihn über Startseite und Navigation verwenden. Er läuft lokal auf einem Gerät, nur mit den Standard-Einstellungen und **ohne** QR-Code, Multi-Device-Live, Turnier-/Admin-/Datenbankkopplung. Der bisherige Standalone-Entwurf liegt unverändert unter `blinds-timer.html` im zugehörigen Entwicklungsbranch.
2. Geschützter Administrator-Profi-Timer auf Basis der Travis-Funktionstiefe. **Ein Klick vor dem Start** wählt zwischen:
   - **Bärgsunne-Runde:** Mit exakt einer vorhandenen offiziellen Runde verbinden; Teilnehmer und Punkte vom Server, Ergebnisse nach Kontrolle als Entwurf und nach gesonderter Bestätigung über die bestehende Admin-API veröffentlichen.
   - **Freies Turnier:** Gleiche umfangreiche Turniersteuerung, aber mit eigener Teilnehmerliste und eigenen Ergebnissen. Keine Verbindung zur offiziellen Bärgsunne-Meisterschaft. Vom Administrator eingerichtet; keine allgemeine Erlaubnis für Website-Besucher, solche Live-Turniere zu eröffnen.

Beide Profi-Betriebsarten sollen nach Freigabe eine **neutrale QR-Live-Zuschaueransicht** bereitstellen, mit Uhr, Blinds, Teilnehmerstatus, Struktur, Chips und Turnierverlauf; Gäste dürfen niemals administrieren oder in die Bärgsunne-App navigieren. Der QR-Code muss eine separate schreibgeschützte Zugangsberechtigung repräsentieren. Keine private Spieleransicht.

## Was implementiert ist (nur im Entwicklungsbranch)

- `profi-timer.html`: getrennte lokale **Entwicklungs-Demo** mit Ein-Klick-Moduswahl, gesperrtem Modus nach Start, lokalem Countdown und Stufenplanung aus dem bisherigen Standalone-Prototyp, eigenem Event-Log für Ausscheidung/Rebuy/Add-on, Spielerstatus, Durchschnittsstack, Ergebnisentwurf bei einem verbliebenen aktiven Spieler, Undo und JSON-Export.
- Beispielteilnehmer sind absichtlich **nur neutrale Testspieler**, keine echten Saison-Daten.
- `tests/profi-timer-demo.cjs`: reproduzierbare Node-Tests, Aufruf `node tests/profi-timer-demo.cjs`. Geprüft unter anderem Moduswahl, Sperre, Ausscheiden, Rebuy, Undo, Platzierungen und Isolation.
- Der private Timer `blinds-timer.html` sowie `main`, `admin.html`, `admin-live.js`, der veröffentlichte Worker, D1-Daten und historische Ergebnisse wurden NICHT geändert.

## Was ausdrücklich NOCH NICHT fertig ist

- **Keine echte Administratorauthentifizierung oder sichere Freischaltung für die Profi-Demo.** Daher ist sie noch nicht veröffentlicht und darf nicht produktiv als Administratorfunktion verwendet werden.
- **Keine tatsächliche Anbindung an die Bärgsunne-API.** Rundenergebnisse werden weder in D1 noch in der offiziellen Rangliste gespeichert. Der Abschlussjahrgang 2026 bleibt schreibgeschützt.
- **Kein echter Live-QR-Zugang.** Die Zuschauer-Ansicht braucht einen separaten, serverseitig geschützten Dienst für Freigabe, Live-Synchronisation und Ablauf.
- **Keine produktionsreife Chip-/Rebuy-Regelprüfung**, kein verbindlicher Test auf iOS/iPad/Desktop unter echten Browserbedingungen. Regeln zum Rebuy-Zeitfenster, Add-on, Ausschluss/Reentry und Finaltie sind vor Freigabe zu ergänzen.
- **Kein verifizierter HTTPS-Preview-Deploy** für diesen Entwicklungsbranch. Cloudflare-Connector war beim Versuch am 21.10.2026 technisch nicht erreichbar. Bestehende Preview-Worker und öffentlicher Live-Worker wurden nicht überschrieben.
- **Keine bewiesene 0-CHF-Kostenfreigabe** für reale Live-Synchronisation: Kontotarif-/Abrechnungsprüfung bleibt offen. Bis dahin keine neuen kostenpflichtigen Dienste.

## Bestehende offizielle API – nur nach sicherer Integration nutzen

Die bestehende Administration verfügt über `GET /api/admin/state?year=...` sowie `PUT /api/admin/round` mit `action: 'draft' | 'publish' | 'withdraw'`, `revision`, `year`, `round`, `places`, und Authentifizierung. Bei einer Integration muss der Server die Saison-/Rundenrechte überprüfen; der Profi-Timer darf keinen eigenen inoffiziellen Schreibweg an der Revision vorbei erhalten. Ein Spielereignis ist nie automatisch ein offizieller Platzierungseintrag, insbesondere bei einem Rebuy.

## Weiterer Implementierungsplan

1. Offizielle Moduswahl im serverseitig geschützten Admin-Bereich mit echter Admin-Sitzung einbinden. Keine URL-/UI-Sperre als Sicherheitsersatz.
2. Offizielle Runden ausschliesslich aus dem bestehenden State laden, abgeschlossene Jahrgänge unveränderlich belassen. Modus nicht nachträglich umschalten.
3. Rebuy-/Add-on-Regeln und vollständige Ergebniskontrolle implementieren; `draft` von `publish` strikt trennen; 409-Revisionskonflikte abfangen.
4. Neutralen QR-Live-Viewer über getrennten, schreibgeschützten Session-Link aufbauen; Änderungen ereignisgesteuert senden, keine sekündlichen HTTP-Abfragen.
5. Keine Paid-Dienste nutzen; bestehende Kontotarife und Free-Limits bestätigen; Lasttest für 20–50 Teilnehmer bei 0 CHF.
6. Erst danach eine echte isolierte HTTPS-Vorschau erstellen, iPhone/iPad/Desktop abnehmen und die öffentliche Website nur nach ausdrücklicher Zustimmung ändern.

**Diese README dokumentiert den tatsächlichen Umsetzungsstand, nicht eine bereits veröffentlichte Funktion.**

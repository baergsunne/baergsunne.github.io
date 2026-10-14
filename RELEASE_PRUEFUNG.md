# Bärgsunne Poker – Designentwicklung 1.9.8

## Implementiert
- Eigener, vom Bestand getrennter Stil-Layer `editorial.css`: Schrift, Farben, Start- und Hero-Bereiche, Navigation, Tabellen, Spieler- und Championkarten, Filter, Mobilansichten.
- In `index.html` eingebunden; Versionskennzeichnung auf 1.9.8.
- Drei alte Beschriftungsfehler beseitigt: 16 statt 15 Turniere, 3 statt 4 turnierfreie Jahre, alter Turi-2008-Warnhinweis.
- `manifest.webmanifest` aus Demo-Titel auf historisches Archiv berichtigt.
- Bestehende Daten und Berechnungen nicht verändert. Eine nicht mehr benötigte Ausnahme bei der Jahressummen-Prüfung entfernt.

## Prüfungen
- JavaScript-Syntaxprüfung (app.js und data.js): PASS.
- JSON des historischen Archivs: 16 Turniere, 154 Spieler-Jahrgänge, turnierfrei 2014/2020/2023: PASS.
- Struktur, Ressourcenverweise und ZIP-Inhalt: PASS.
- Browserprüfung über Chromium: BLOCKIERT durch `ERR_BLOCKED_BY_ADMINISTRATOR` beim lokalen HTTP- und Datei-Aufruf. Dies ist KEIN bestandener Browsertest.
- Nutzer-iPhone-Abnahme: OFFEN.

## Externe Open-Source-Bibliotheken
Die bestehenden SVG-Diagramme, Tabellen und Navigation werden aus Stabilitäts- und Geschwindigkeitsgründen in dieser Stufe erhalten. ECharts/Tabulator/Lucide sind geprüft als mögliche *gezielte* Ergänzungen, aber **nicht eingebaut**. Penpot ist die Designreferenz; das öffentliche Projekt enthält keine Penpot-Cloud-Abhängigkeit. Zusätzliche Laufzeitbibliotheken dürfen erst nach echten Vergleichs- und Mobiltetests integriert werden.

## Veröffentlichungsstatus
NICHT veröffentlicht. Wegen blockierter Browserregression trotz Owner-Dauerfreigabe HOLD für Release; keine Änderung am Remote-Repository.

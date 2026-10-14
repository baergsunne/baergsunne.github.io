# Bärgsunne Poker 2.0.7 – Analyse-Baukasten

## Implementiert
- Ein einziges dynamisches Eingabetool auf Statistiken → Analyse-Studio.
- Beliebig hinzugefügte Bedingungen (bis 20 gleichzeitig), mit UND / ODER.
- Eigene Spieler-, Jahres- und Rundenauswahl je Bedingung.
- Alle / Einzelne / Von–bis / Alle ausser / Erste X / Letzte X; freie Zahlen.
- Runden: Siege, Podestplätze, ausgewählte Platzierungen, Punkteschwellen, letzter Platz.
- Schlussrang und Gesamtpunkte.
- Automatische Abfrage tatsächlich erfasster Turniere; Trefferliste mit Schlussranglisten und Einzelwerten.
- Lokale Aufbewahrung der laufenden Auswahl ohne externe Dienste.
- Mobile aufklappbare Bausteine; Farbwelt dem Bestand angepasst.

## Prüfungen
- `node --check` app.js und analyse-studio.js bestanden.
- Node-V8-Laufzeittest gegen `data.js`: 16 Turniere, Rundenauswahl 2/4/7, Jahresfilter, Von–bis, Ausschlüsse bestanden.
- Datenbestände `data.js` und `historische-ergebnisse.json` binär unverändert.

## Noch offen – keine Behauptung der vollständigen Zielumsetzung
- Visuelle iPhone-Safari-Abnahme / vollwertiger Browser-Test (Browser hier nicht installiert).
- Erweiterte Verknüpfungsgruppen mit Klammern/NOT, individuelle Spielergruppen und tiefe Karriere-, Serien-, Aufholjagd-Analysen.
- Sichtbare Unterscheidung von mehreren Spielern im selben Bedingungsblock und Vergleichsmetriken.
- Formulierte Beispiele je Treffer und Export/Share sind Ausbauziele.
- Repository-Publikation und echte HTTPS-Abnahme.

Diese Fassung ist ein funktionsfähiger erster Kern des universellen Analyse-Baukastens, keine Behauptung, bereits alle Millionen möglichen Fragen vollständig abzudecken.

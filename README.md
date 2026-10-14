# Bärgsunne Poker 1.9.5 – Historische Statistiken

Fortführung der vollständigen ursprünglichen Anwendung (kein Redesign). Alle Statistikseiten verwenden den realen Seed in `data.js` und die echten Originaljahre. Kein Testdatensatz aktiv.

**Verbindliche Datenbasis:** 15 Austragungen 2007–2025. Turnierfreie Jahre: 2014, 2020, 2021, 2023. Sonntag gehört zum jeweiligen Turnier. Für 2007 sind alle sieben Runden im Total enthalten. Tobi und Töbu sind getrennte Personen.

**Wichtige Einschränkung:** Bei Turi 2008 wurde durch Owner-Bestätigung korrigiert: Runde 5 = 6 Punkte / Rang 3, Gesamt 61 Punkte / Schlussrang 5. Alle Rundensummen entsprechen den offiziellen Totals. Gedankenexperimente (Simulator) sind keine Originalergebnisse.

Version 1.9.5: Korrektur irreführender Demo-Kennzeichnung in den Standardanalysen, Startjahr 2007 statt 2010, fortlaufende Qualitätskennzeichnung und Manifest-Text. Keine Serverzugriffe oder kostenpflichtige Dienste hinzugefügt. GitHub-Pages-Deployment und iPhone-Abnahme offen.

## Korrektur 1.9.5
Turi 2008: Runde 5 = 6 Punkte und Rundenrang 3. Fösu und die nachfolgenden Spieler dieser Runde werden entsprechend neu gereiht; offizielles Endtotal 61 und Endrang 5 bleiben unverändert. 144 von 144 Zeilen rechnerisch konsistent. Keine GitHub-Veröffentlichung durch dieses ZIP.

## Version 1.9.6 (Veröffentlichungskandidat)
- Korrigiert das veraltete Prüfmerkmal: 0 bekannte Rundensummen-Konflikte nach Owner-Korrektur zu Turi 2008.
- Epochenanalyse beginnt 2007; Karrieretext nennt 2007–2025.
- Analyse-Studio kennzeichnet historische Zahlen nicht mehr als Demo-Datensätze.
- Bestehende Anwendung und zwölf Projektdateien samt .nojekyll bleiben erhalten.
- Keine Veröffentlichung und keine iPhone-Abnahme durch die Paket-Erstellung.

## v1.9.7
Originalturnier 2021 aus IMG_0324.jpeg mit zehn Spielern und sieben Runden ergänzt. 16 statt 15 Turniere. Turnierfrei 2014, 2020, 2023.

## 1.9.8 Hybrid Editorial
Visuelles Redesign durch `editorial.css` mit Clubgrün, Creme, Messing, Serifentiteln, flachen Datenkomponenten und mobiler Navigation. Keine Daten- oder Formeländerung. Status vor Veröffentlichung separat prüfen. Bestehende SVG-Diagramme und Tabellen bleiben aus Performancegründen erhalten; ECharts/Tabulator nicht ohne belegten Funktionsbedarf injizieren. Penpot-Designvorgabe in DESIGN_1.0.md. Kosten CHF 0.

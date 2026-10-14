# Prüfung Version 2.0.0

- Ursprung: Version 1.9.9; keine Neuentwicklung
- data.js, historische-ergebnisse.json und backend-config.js: SHA256 identisch mit 1.9.9
- Syntax: node --check app.js bestanden
- Browser: isolierter HTML/JS/CSS-Test via Playwright Chromium auf 375/390/768/1440 erfolgreich, keine JS-Seitenfehler oder globales horizontales Überlaufen; Statistikseite auf 390 geöffnet
- Einschränkung: Browserdatei-Aufrufe von Testumgebung blockiert. Test lädt SVG-Bilder nicht; deshalb Grafikauslieferung/visuelle Darstellung nicht vollständig geprüft
- iPhone Safari: offen
- GitHub-Pages-Deployment: nicht durchgeführt
- Original-Fotos in selbst erstellten stilisierten SVGs interpretiert, nicht 1:1 nachgezeichnet
- Keine externen APIs, Dienste oder Fonts; CHF 0

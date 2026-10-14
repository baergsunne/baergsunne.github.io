# Fehleranalyse und Korrektur 2.0.8

- GitHub 2.0.7 hatte die beiden durch index.html geladenen Dateien `analyse-studio.js` und `analyse-studio.css` nicht.
- Die beiden Dateien müssen im Repository-Stamm liegen.
- Bei `Alle ausser` bedeutet `Alle` jetzt alle einschliessen, `Keine` schliesst alle aus.
- Bei leerer Rundenauswahl ergeben Runde-bezogene Bedingungen keinen Treffer.
- Bei leerer Auswahl von Rundenplatzierungen ergeben diese Bedingungen keinen Treffer.
- Altdaten unverändert.
- Lokaler Syntax- und Auswahltest folgt; iPhone-Sichtprüfung offen.

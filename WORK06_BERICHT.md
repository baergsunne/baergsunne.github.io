# Bärgsunne Poker – Work 06, korrigierter Integrationsstand

Stand: 15. Oktober 2026. Im isolierten GitHub-Branch und als private HTTPS-Vorschau bereitgestellt; `main` und die öffentliche GitHub-Pages-Website bleiben unverändert. Der Owner hat die fünf neu gelieferten Hero-Bilder ausdrücklich abgelehnt; sie sind in diesem Stand weder eingebunden noch im aktuellen Dateibaum enthalten. Die bestehende Bildgestaltung der Website (einschliesslich der bisherigen Alpine- und Trophäenbilder) bleibt unverändert.

## Reparaturen

Die Statistikseite war im Ausgangsstand tatsächlich defekt: `activeToolChoice()` griff auf die nicht definierte Konstante `TOOL_CHOICES` zu. Der Fehler wurde am Ausgangscode reproduziert. Die Konstante ist jetzt initialisiert; gespeicherte Filter werden validiert und können bei beschädigtem oder blockiertem Browserspeicher den Aufruf nicht verhindern. Ungültige Statistikwerkzeuge werden auf die Übersicht zurückgesetzt. Rendererfehler erhalten eine sichtbare Meldung und einen Rückweg; ausgewählte globale Filter werden wiederhergestellt.

Weitere Korrekturen: Initialisierung der Seite nach dem Laden der ergänzenden Skripte, Browser-History/Hash-Navigation sowie nicht deklarierte Variablen beim „Alle auswählen“-Knopf des Analyse-Studios. Historische Ergebnisse, Originaldaten und Berechnungsformeln wurden nicht verändert.

## Sinnvoll verwendete SVG-Symbole

16 von 25 gelieferten Symbolen werden mit Textlabel und `currentColor` in Navigation, Filtern und Werkzeugkacheln verwendet: `mountain-home`, `archive`, `chart-trend`, `players`, `crown`, `calendar-year`, `filter-players`, `compare`, `duel`, `rounds`, `record`, `heatmap`, `simulator`, `pattern`, `chart-selection`, `explanation`. Die vollständige Quellbibliothek liegt unter `assets/icons`, ohne Verpflichtung, alle Symbole auf der Website einzusetzen. `live-dot` bleibt ohne nachgewiesenen Live-Status aus; `fish-shark` begründet keine erfundene Spielerkategorie.

## Prüfstatus

`node test-ui.cjs` prüft sieben Routen, alle 13 Statistikwerkzeuge, 39 Werkzeug-/Filterkombinationen, Direktaufrufe ohne die gelieferten Hero-Bilder, Hash-Navigation, ungültige Einstellungen, blockierten Browserspeicher, sechs Diagrammtypen, alle 16 historischen Jahrgänge mit Rundenwechseln und die Schnellwahl im Analyse-Studio. `node test-hall.cjs` prüft 26 Rekorde. Originaldaten sind bytegenau gegenüber dem Ausgangsstand unverändert. Diese Tests simulieren den DOM in Node und beweisen keine echte iPhone-, Tablet- oder Desktop-Darstellung.

Die private HTTPS-Vorschau ist unter https://baergsunne-poker-work06.p-sch547537.chatgpt.site verfügbar. Der Owner hat die Darstellung und Bedienung auf seinem Smartphone selbst angesehen und für gut befunden. Screenshots sind für diese visuelle Owner-Abnahme nicht erforderlich. Die automatisierten Funktionstests ergänzen diese Rückmeldung; eine unabhängige, instrumentierte Safari-Prüfung ist hier nicht verfügbar. Tablet- und Desktop-Abnahmen sind für die ausschliesslich auf Smartphones genutzte App nicht erforderlich.

## GitHub und Übergabe

Repository: https://github.com/baergsunne/baergsunne.github.io. Ausgangsstand `main` = `b6f286c5e9063b26aaa30f221e2fa16518cf9e87` (Version 2.2.6). Nach Installation des ChatGPT Codex Connector für `baergsunne` gelang der Schreibzugriff. Der isolierte Remote-Branch `work/06-stats-symbols-20261015` enthält einen sauberen Commit `aaff47eb152701149d81ff42507eb5245b9407b2`, dessen Baum exakt dem korrigierten lokalen Dateistand entspricht. Entwurfs-PR: https://github.com/baergsunne/baergsunne.github.io/pull/1. Die aktuelle öffentliche Website https://baergsunne.github.io/ enthält noch den unveränderten Ausgangsstand.

Das aktuelle ZIP enthält die Website ohne die fünf unerwünschten Bilder, Tests, Bericht und einen Patch gegenüber `main`. Das frühere Paket `BAERGSUNNE_POKER_WORK06_2.2.7_PRUEFPAKET.zip` ist durch dieses korrigierte Paket überholt und darf nicht zur Integration verwendet werden.

Nächster Schritt: Vor einer Übernahme nach `main` und damit öffentlicher Veröffentlichung ausdrückliche Owner-Freigabe einholen. Bei später gemeldeten Fehlern den Entwurfs-PR aktualisieren. Budget CHF 0.

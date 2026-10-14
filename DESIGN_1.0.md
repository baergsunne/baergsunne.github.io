# Bärgsunne Poker – Designkonzept 1.0
Stand: 14. Oktober 2026 · Status: Designvorgabe, noch nicht implementiert

## Ziel
Eigenständige Mischung aus (A) Sportmagazin und Pokertradition, (B) moderner Sportdatenplattform und (C) klassischem Pokerclub. Keine Änderung am bestehenden Datenmodell oder den Analyseformeln durch eine reine Designüberarbeitung. Originalergebnisse 2007–2025 mit 16 Turnieren bleiben alleinige Quelle. Bärgsunne-GitHub-Repository und GitHub Pages; CHF 0; iPhone zuerst.

## Befund am Quellcode von Version 1.9.7
- `style.css` verwendet durchgehend sehr ähnliche gerundete Karten (`.kpi`, `.card`, `.feature`, `.playercard`, `.record`) mit Gradienten, Schatten und etwa 20px Radius.
- `.hero` hat starke Gradienten, grossformatiges ♠-Wasserzeichen und einen Radius von 27px.
- Navigation liegt in `.desktopnav` / `.bottomnav`; globaler Filter in `.filterbar`.
- Die App rendert Inhalte in `app.js` mit Seiten Home, Historie, Statistik, Spieler, Ruhmeshalle und Live sowie Analysemodulen.
- Im Startseitentext existiert noch der veraltete Hinweis «4 turnierfreie Jahre»; mit dem hinzugefügten Turnier 2021 sind es 3 (2014, 2020, 2023). Das ist eine separate Inhaltskorrektur, kein Designentscheid.

## Designprinzipien
1. Atmosphäre durch Typografie, Kontrast, Rhythmus und Fakten statt durch Glow-Effekte.
2. Erzählen auf Startseite und in Jahrgängen; präzise Datendarstellung in Statistik- und Vergleichsansichten.
3. Seltene, begründete Akzente: Gold nur für Meister, Rekorde und wichtige Orientierungsmarken.
4. Kein überall identisches Kartenraster: redaktionelle Aufmacher, flache Tabellen, Dossierseiten und zurückhaltende Module.
5. Keine dekorativen Falschsignale: «Live» nur bei tatsächlich aktiver, gesicherter Datenversorgung; Prognosen klar als Rechenbeispiel kennzeichnen.

## Gestaltungswerte (Design-Tokens)
- Canvas dunkel `#101B17`; Flächen `#182920`; erhöhte Fläche `#21372B`
- Creme `#F4F0E5`; sekundärer Text `#BEC8BB`; Trennlinien `#465C4D`
- Messing/Gold `#C8A566`; Akzent für positive Daten `#6EB99A`; Warnsignal `#D99A77`
- Keine grossflächigen Goldverläufe, keine Neon-Glow-Grafik.
- Schriften: Systemschriften ohne kostenpflichtige Dienste. Editorial-Titel über Georgia/serif; Bedienoberfläche über system-ui/-apple-system; Zahlen tabellarisch mit `font-variant-numeric: tabular-nums`.
- Radius: Standardmodule 8px, besondere Editorial-Tafeln 2–4px, Buttons 8px. Pill-Form nur für Filter-Chips.
- Schatten ausschliesslich bei überlagernden Menüs; Karten primär durch Linien und Flächen trennen.
- Abstände im 4/8px-Raster; Inhalt mobil 16–20px Seitenrand; Touchflächen min. 44×44px.

## Informationsarchitektur
- Start: Redaktioneller Aufmacher, aktueller Champion 2025, schnelle Jahresnavigation, Schlüsselrekorde, drei echte Geschichten, Einstieg ins Statistikarchiv.
- Historie: Jahresleiste, Champion und Schlussklassement, Rundentabelle, Punkteverlauf und Erklärungen. Turnierfreie Jahre in der Zeitachse ausdrücklich markieren.
- Statistiken: Übersicht nach Fragen: «Wer gewann am häufigsten?», «Wer war besonders konstant?», «Wie knapp war es?»; vertiefende Reiter der bestehenden App erhalten.
- Spieler: Dossiers mit Titelbilanz, Teilnahmeverlauf, besten/schwächsten Jahrgängen und Rivalitäten. Nicht einheitliche Steckbriefkarten für alles.
- Analysen: Festes Erklärungsmuster: 1) Frage, 2) Ergebnis in Alltagssprache, 3) echte Belegjahre und Zahlen, 4) Gegenbeispiel, 5) Grenze der Aussage, 6) Berechnung optional aufklappbar.
- Live/Admin: Kein suggerierter Livestatus ohne Backend. Admin-Sicherheit ausschliesslich serverseitig, keine sensiblen Zugangsdaten in GitHub Pages.

## Komponentenbibliothek
1. Editorial-Aufmacher: Serif-Headline, knappe Faktenzeile, ein Highlight; kein generischer Verlauf.
2. Champion-Marke: Jahreszahl, Name, Punkte; Gold als seltener Ehrenmarker.
3. Statistikstreifen: 2–4 präzise Kennzahlen ohne einzelne 3D-Karten.
4. Jahresleiste: horizontale Timeline, aktive Auswahl klar markiert, keine Farbüberladung.
5. Tabelle: Kopfzeile, klare Zebrastreifen oder feine Trenner, fixierte Spielerbeschriftung bei Bedarf; mobil horizontal scrollen mit sichtbarem Hinweis.
6. Diagramm: einheitliche Legende, direkte Beschriftung, Farbkontrast und alternativ lesbare Tabelle.
7. Aufklappbare Erklärung: natürliche Frage als Titel, echte Belege, kein erfundener Jahresfall.
8. Spieler-Dossier: Ein Titelbild aus Typografie, keine Stock-Porträts oder fiktiven Avatare.
9. Muster-Finder: «In X von Y Fällen», «ohne Voraussetzung A von B», Gegenbeispiele sowie klarer Fallzahl-Hinweis.

## Exemplarisches Inhaltslayout Start (nur Struktur)
Header: BÄRGSUNNE POKER / SEIT 2007
Aufmacher: «16 Turniere. Eine Geschichte voller Wendungen.»
Subline: «Echte Resultate aus Lenk, vom ersten Jahrgang bis 2025.»
Archivstreifen: 2007–2025 · 16 Turniere · 3 turnierfreie Jahre
Champion-Fokus: «2025 · Fösu · 44 Punkte»
Sektion «Die Jahre»: horizontale Jahrauswahl.
Sektion «Aus den Zahlen»: automatisch berechnete, überprüfte Fakten statt drei gleichförmiger Fake-Story-Karten.
Sektion «Entdecken»: Historie, Karrieren, Duelle, Analysen.

## Umsetzung ohne Neuentwicklung
Phase D1: Design-Tokens in neuem, isoliertem CSS-Layer definieren. Bestehendes `app.js`, `data.js` und die historischen Quellen unverändert lassen. Fehlende Inhaltskorrekturen getrennt erfassen.
Phase D2: Navigation, Hero, Startseite, Tabellen, Filter, Analyse-Erklärungen schrittweise stilisieren; CSS-Klassen und Ereignis-Handler erhalten.
Phase D3: Historie und Spielerprofile überarbeiten. Diagramme und Datenzugriffe unverändert.
Phase D4: Kontrolltests auf mobilen Breiten 320, 375, 390 und 430px sowie Tablet/Desktop 768 und 1440px.
Phase D5: Alle Ansichten und Filter testen, Quelle gegen Daten prüfen, danach gemäss bestehender Owner-Freigabe nur bei grüner Prüfung auf Bärgsunne-GitHub veröffentlichen. GitHub-Commit, Live-Auslieferung und echte iPhone-Abnahme separat protokollieren.

## Nicht verändern
Keine Änderungen an historischen Resultaten, Spielermapping, Rangsummen, Formeln, Scoring-Regeln, API-Rechten oder Admin-Authentifizierung durch den Designauftrag. Keine zusätzlichen externen Dienste, keine bezahlten Fonts, keine ZFF-Ressourcen.

## Abnahmekriterien
- Wahrnehmbar keine einförmige Neon-/Gradienten-Kartenoptik.
- Start, Historie, Statistiken, Spieler, Ruhmeshalle, Analysen, Live aus der Navigation erreichbar.
- Globale Jahr-/Spielerfilter funktionieren und sind zurücksetzbar.
- Alle Tabellen, Diagramme und aufklappbaren Erklärungen auf iPhone lesbar; keine abgeschnittenen Werte.
- Nur echte belegte Fakten; keine KI-erfundenen Beispiele.
- `prefers-reduced-motion`, Tastaturfokus, ausreichende Kontraste, mobile Touchziele berücksichtigt.
- Kein unbeabsichtigtes Backend/Production/anderes Repository verändert.
- Version und Live-Seite sind erst dann «abgenommen», wenn entsprechende Prüfungen dokumentiert sind.

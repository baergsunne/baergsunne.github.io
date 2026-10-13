# Bärgsunne Poker · Demo v1.1

Kostenlose, eigenständige GitHub-Pages-Demo unter https://baergsunne.github.io/ .
Alle historischen Resultate 2010–2025 sind **simuliert**.

## Änderungen v1.1
- Startseite: „Bärgsunne Poker. Lenk.“ / „Alle Lutschköpfe und Fische auf einen Blick.“
- Statistik-Kacheln führen zur passenden Auswertung.
- Hall of Champions mit antippbaren Karten und markierten Mehrfachsiegern.
- Farbige Diagrammlegenden mit Abständen, bessere Tabellenlesbarkeit.
- Globale Mehrfachauswahl **Jahrgänge × Spieler**. Keine Auswahl = alle.
- Datenverwaltung nicht mehr auf der Startseite.
- Live-Seite heisst „Bärgsunne Poker 2026“.
- Öffentliche Rundenerfassung entfernt. Admin-Seite zeigt bewusst gesperrten Zustand.

## Sicherheit / noch offen
**Kein echter Admin-Login und keine geräteübergreifende Live-Synchronisation.**
Beides benötigt einen geschützten Backend-Dienst mit serverseitigen Schreibberechtigungen. Auf GitHub Pages alleine kann man sichere Adminrechte nicht umsetzen. Niemals Passwörter in diesem öffentlichen Repository speichern.

## iPhone-Deployment
Nur die Dateien `index.html`, `app.js`, `style.css`, `data.js`, `demo-data.json`, `manifest.webmanifest` und `.nojekyll` ins Stammverzeichnis von `baergsunne/baergsunne.github.io` laden. Dateien, die schon existieren, ersetzen. Kein Zugriff auf ZFF-Media-Repositories.

# Live-Tabelle und Admin-Konzept

Status: 2.2.6 – öffentliche Leseansicht eingebaut, keine Schreibfunktion veröffentlicht.

## Grundregeln
- Statische GitHub-Pages-Website besitzt keine sicheren Admin-Schreibrechte. Kein Passwort oder API-Schlüssel im Browser-Quellcode.
- Gesicherter, kostenloser Cloudflare Worker mit D1 wäre ein möglicher nächster Schritt (Free-Tier-Grenzen beachten). Nicht angelegt.
- Admin authentifiziert sich serverseitig; serverseitige Autorisierung auf jeder Schreibroute. Keine Secrets in localStorage. CSRF-/Origin-Prüfung, Rate-Limit und Audit-Log vor Livebetrieb.
- Transaktionale Rundenfreigabe: Entwurf -> serverseitige Validierung -> Veröffentlichung; eindeutige Rundenplatzierungen, passende Teilnehmer, richtige Punktregeln, Version gegen parallele Bearbeitung, Rücknahme und Revisionsprotokoll.
- Öffentliche GET /api/live liefert ausschliesslich freigegebene Zwischenstände inkl. status, standings [{rank,player,points}], updated_at und möglichst edition/round. Noch kein Backendschema verbindlich implementiert.
- Bei keiner veröffentlichten Live-Saison zeigt die Website ehrlich „Kein aktives Live-Turnier“. Historische Originaldateien werden niemals live überschrieben.
- Champion wechselt erst nach offizieller Archivfreigabe, nicht beim laufenden Live-Turnier.
- Live-Endpunkt wird erst nach API-Tests und gesonderter Deployment-Freigabe in backend-config.js konfiguriert.

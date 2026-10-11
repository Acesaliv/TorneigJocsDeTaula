# Torneig 12 jugadors — Gestor

Petit single-page app per gestionar un torneig de 12 jugadors en 3 taules i 3 rondes.

Instruccions ràpides:

- Obre `index.html` al navegador.
- Introdueix 12 noms i marca (opc.) 3 jugadors com a "Rol esp.".
- Prem `Assignar aleatòriament números` per distribuir els números/símbols.
- Prem `Començar torneig` per veure la Ronda 1 (taules muntades).
- Per canviar manualment una posició, fes clic a `Intercanviar` al jugador i introdueix el nom exacte del jugador amb qui vols fer l'intercanvi.
- Introdueix puntuacions i prem `Guardar puntuacions ronda`.
- Navega entre rondes amb `Següent ronda` / `Ronda anterior`.

Regles implementades:

- Números 1–4 → Taula 1 (quadrats vermells), 5–8 → Taula 2 (rodones blaves), 9–12 → Taula 3 (pentàgons verds) a la Ronda 1.
- Ronda 2 i 3 roten la taula per cada número, de manera que cada jugador juga a les 3 taules al final de les 3 rondes.
- Quan hi ha 3 jugadors marcats com a "Rol esp.", l'assignació inicial es torna a generar fins que ocupin taules inicials diferents (si és possible).

Persistència: l'estat es guarda a `localStorage` del navegador.

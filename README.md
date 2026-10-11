# 🎲 Gestor de Tornejos de Jocs de Taula

Aplicació web autònoma, moderna i adaptable per a gestionar tornejos de jocs de taula: repartiment intel·ligent de taules i torns, selecció flexible de participants, temporitzador de sala i taula de puntuacions en viu.

> 📁 *Nota:* La versió anterior del projecte s'ha arxivat a la subcarpeta `v1/`.

---

## 🚀 Com començar

No cal instal·lar res ni disposar de cap servidor o entorn de programació:

1. Obre el fitxer **`index.html`** directament amb qualsevol navegador web (Chrome, Firefox, Safari, Edge) des del teu ordinador, tauleta o telèfon mòbil.
2. L'aplicació funcionarà fins i tot **sense connexió a internet** i desa totes les teves dades automàticament a la memòria local (`localStorage`).

---

## ✨ Funcionalitats Principals

### 1. Gestió de Participants i Fitxers de Configuració
- **Cens mestre de jugadors:** Afegeix, edita o elimina participants lliurement.
- **Descarregar fitxer de configuració (`.json`):** Amb el botó `💾 Descarregar fitxer (.json)` pots desar la teva llista sencera de participants al teu ordinador (`participants_torneig.json`).
- **Carregar fitxer de configuració:** Amb el botó `📂 Carregar fitxer` pots importar:
  - Fitxers `.json` (com ara [participants_exemple.json](file:///d:/ProjectesProgramacio/TorneigJocsDeTaula/participants_exemple.json)).
  - Fitxers de text pla `.txt` (un nom per línia).
- **Afegir en bloc:** Permet enganxar un llistat de noms de cop. Afegint un asterisc `*` al final (ex: `Marc*`), s'assigna automàticament el **Rol especial**.
- **🔗 Parelles inseparables (mateixa taula):**
  - Pots crear parelles de 2 participants amb el botó `🔗 Gestionar parelles`.
  - **Garantia matemàtica:** Els membres de la parella s'assignen **sempre a la mateixa taula a totes les rondes del torneig**.
  - **Sincronització de selecció:** En marcar o desmarcar el check d'un membre de la parella, el seu company es marca o desmarca automàticament.
  - Els fitxers de configuració JSON desen i restauren les parelles amb el camp `"pairId"`.

### 2. Selecció per al Torneig Concret (Checkboxes)
- L'administrador selecciona amb una **casella de selecció (checkbox)** quins participants del cens jugaran el torneig d'avui.
- Botons de selecció ràpida: `Tots`, `Cap`, `Primers 12`, `Primers 16`.
- Comptadors en temps real i suggeriments del nombre de taules que es formaran.

### 3. Configuració Personalitzada del Torneig
- Mida de taula flexible: **4 jugadors per taula** (recomanat), 3 o 5 jugadors.
- Càlcul automàtic del nombre de taules necessàries.
- Nombre de rondes (per defecte 3).
- **Jocs de taula per taula:** Pots indicar quin joc es juga a cada taula (ex: Taula 1: Catan, Taula 2: Carcassonne, Taula 3: Azul...).
- Temps per ronda per al cronòmetre de la sala.

### 4. Algorisme de Repartiment de Taules i Torns
L'algorisme genera els emparellaments garantint de forma intel·ligent:
1. **Rols especials:** Es distribueixen en taules diferents per no coincidir mai (ideal per a persones que expliquen les regles).
2. **Rotació de taules:** Cada jugador visita taules i jocs diferents a cada ronda.
3. **Varietat de companys:** Es minimitzen o eviten les parelles repetides entre rondes.
4. **Insígnies visuals:** Cada jugador té una insígnia amb forma geomètrica (quadrat, cercle, pentàgon, rombe...) i color que facilita identificar la posició a la sala.

### 5. Taules en Joc i Puntuacions
- **Intercanvi manual (Swap):** Si a la sala dos jugadors han de canviar de lloc per qualsevol motiu, el botó `⇄` permet intercanviar-los amb un sol clic.
- **Temporitzador de sala:** Cronòmetre amb compte enrere, avisos visuals de colors i xiulet sonor en finalitzar.
- **Entrada àgil de puntuacions:** S'introdueixen a cada seient i es desen a l'instant.

### 6. Classificació i Premis
- **Podi visual (Top 3):** Medalles d'or, plata i bronze per als líders.
- **Taula completa:** Desglossament detallat de punts ronda a ronda (R1, R2, R3...) i punts totals.
- **Exportació:**
  - `🖨️ Imprimir / PDF`: Format net optimitzat per a full d'impressora.
  - `📊 Exportar CSV`: Compatible amb Microsoft Excel i Google Sheets.
  - `💾 Descarregar Torneig (JSON)`: Còpia de seguretat íntegra del torneig.

---

## 📁 Estructura del Projecte

```text
TorneigJocsDeTaula/
│
├── index.html                  # Interfície web de l'aplicació
├── styles.css                  # Estils visuals, disseny responsive i mode projector
├── app.js                      # Lògica d'emparellaments, estat, arxius i temporitzador
├── participants_exemple.json   # Fitxer de mostra amb 16 participants preparats
├── README.md                   # Documentació del projecte
│
└── v1/                         # Còpia de seguretat de la versió anterior
    ├── index.html
    ├── styles.css
    ├── app.js
    └── README.md
```

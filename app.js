/**
 * Gestor de Tornejos de Jocs de Taula
 * Aplicació web autònoma per a l'organització de partides, rondes i puntuacions.
 * Suporta parelles inseparables que juguen sempre juntes a la mateixa taula.
 */

(function () {
  'use strict';

  // ==========================================================================
  // ESTAT GLOBAL DE L'APLICACIÓ
  // ==========================================================================

  const STORAGE_KEYS = {
    POOL: 'boardgame_tournament_pool_v2',
    TOURNAMENT: 'boardgame_tournament_active_v2'
  };

  // Noms de jocs habituals per suggerir automàticament
  const DEFAULT_GAME_SUGGESTIONS = [
    'Catan', 'Carcassonne', 'Azul', '7 Wonders', 'Ticket to Ride',
    'Wingspan', 'Dixit', 'Splendor', 'Terraforming Mars', 'Cascadia',
    'Pandemic', 'King of Tokyo'
  ];

  // Formes i colors per a les insígnies visuals
  const BADGE_STYLES = [
    { shape: 'square', color: 'color-red', symbol: '■' },
    { shape: 'circle', color: 'color-blue', symbol: '●' },
    { shape: 'pentagon', color: 'color-green', symbol: '⬟' },
    { shape: 'diamond', color: 'color-amber', symbol: '◆' },
    { shape: 'hexagon', color: 'color-purple', symbol: '⬣' },
    { shape: 'circle', color: 'color-teal', symbol: '◉' }
  ];

  const state = {
    // Cens mestre de participants (amb pairId per a parelles inseparables)
    pool: [],
    
    // Torneig en curs
    tournament: {
      isActive: false,
      players: [],          // Participants convocats amb id, nom, isSpecial, pairId, scores, badge
      config: {
        tableSize: 4,
        numRounds: 3,
        roundMinutes: 45,
        games: []
      },
      currentRound: 1,      // 1-indexed
      assignments: []       // assignments[roundIndex][playerId] = tableIndex
    },

    // Temporitzador
    timer: {
      totalSeconds: 45 * 60,
      remainingSeconds: 45 * 60,
      intervalId: null,
      isRunning: false
    },

    // Estat temporal per al modal d'intercanvi
    swapSourcePlayerId: null
  };

  // Elements DOM
  const dom = {};

  // ==========================================================================
  // INICIALITZACIÓ
  // ==========================================================================

  function init() {
    cacheDomElements();
    attachEventListeners();
    loadStoredData();
    renderAll();
  }

  function cacheDomElements() {
    // Pestanyes i navegació
    dom.tabs = document.querySelectorAll('.tab-btn');
    dom.tabPanes = document.querySelectorAll('.tab-pane');
    dom.headerStatus = document.getElementById('headerStatus');
    dom.navRounds = document.getElementById('navRounds');
    dom.navLeaderboard = document.getElementById('navLeaderboard');

    // Pestanya 1: Fitxer i participants
    dom.fileInput = document.getElementById('fileInput');
    dom.btnLoadFile = document.getElementById('btnLoadFile');
    dom.btnSaveFile = document.getElementById('btnSaveFile');
    dom.btnLoadExample = document.getElementById('btnLoadExample');
    dom.addParticipantForm = document.getElementById('addParticipantForm');
    dom.playerNameInput = document.getElementById('playerNameInput');
    dom.playerSpecialInput = document.getElementById('playerSpecialInput');
    dom.participantsList = document.getElementById('participantsList');
    dom.selectedCount = document.getElementById('selectedCount');
    dom.totalPoolCount = document.getElementById('totalPoolCount');
    dom.specialSelectedCount = document.getElementById('specialSelectedCount');
    dom.pairsCount = document.getElementById('pairsCount');
    dom.noticeText = document.getElementById('noticeText');
    dom.selectionNotice = document.getElementById('selectionNotice');
    dom.btnSelectAll = document.getElementById('btnSelectAll');
    dom.btnDeselectAll = document.getElementById('btnDeselectAll');
    dom.btnSelect12 = document.getElementById('btnSelect12');
    dom.btnSelect16 = document.getElementById('btnSelect16');
    dom.btnProceedToConfig = document.getElementById('btnProceedToConfig');

    // Modals
    dom.bulkAddModal = document.getElementById('bulkAddModal');
    dom.btnOpenBulkModal = document.getElementById('btnOpenBulkModal');
    dom.btnCloseBulkModal = document.getElementById('btnCloseBulkModal');
    dom.btnCancelBulk = document.getElementById('btnCancelBulk');
    dom.btnConfirmBulk = document.getElementById('btnConfirmBulk');
    dom.bulkNamesTextarea = document.getElementById('bulkNamesTextarea');

    // Modal de parelles
    dom.pairModal = document.getElementById('pairModal');
    dom.btnOpenPairModal = document.getElementById('btnOpenPairModal');
    dom.btnClosePairModal = document.getElementById('btnClosePairModal');
    dom.btnClosePairModalBottom = document.getElementById('btnClosePairModalBottom');
    dom.pairSelect1 = document.getElementById('pairSelect1');
    dom.pairSelect2 = document.getElementById('pairSelect2');
    dom.btnCreatePair = document.getElementById('btnCreatePair');
    dom.existingPairsList = document.getElementById('existingPairsList');

    // Modal d'intercanvi
    dom.swapModal = document.getElementById('swapModal');
    dom.btnCloseSwapModal = document.getElementById('btnCloseSwapModal');
    dom.btnCancelSwap = document.getElementById('btnCancelSwap');
    dom.btnConfirmSwap = document.getElementById('btnConfirmSwap');
    dom.swapPlayerSourceName = document.getElementById('swapPlayerSourceName');
    dom.swapTargetSelect = document.getElementById('swapTargetSelect');

    // Pestanya 2: Configuració
    dom.cfgPlayerCount = document.getElementById('cfgPlayerCount');
    dom.cfgTableCount = document.getElementById('cfgTableCount');
    dom.cfgPlayersPerTable = document.getElementById('cfgPlayersPerTable');
    dom.tableSizeSelect = document.getElementById('tableSizeSelect');
    dom.numRoundsInput = document.getElementById('numRoundsInput');
    dom.roundMinutesInput = document.getElementById('roundMinutesInput');
    dom.tableGamesList = document.getElementById('tableGamesList');
    dom.btnBackToParticipants = document.getElementById('btnBackToParticipants');
    dom.btnGenerateTournament = document.getElementById('btnGenerateTournament');

    // Pestanya 3: Rondes & Taules
    dom.roundIndicator = document.getElementById('roundIndicator');
    dom.roundTotalSub = document.getElementById('roundTotalSub');
    dom.btnPrevRound = document.getElementById('btnPrevRound');
    dom.btnNextRound = document.getElementById('btnNextRound');
    dom.btnSaveCurrentScores = document.getElementById('btnSaveCurrentScores');
    dom.btnProjectorMode = document.getElementById('btnProjectorMode');
    dom.roundTablesContainer = document.getElementById('roundTablesContainer');

    // Temporitzador
    dom.timerDisplay = document.getElementById('timerDisplay');
    dom.btnTimerToggle = document.getElementById('btnTimerToggle');
    dom.btnTimerReset = document.getElementById('btnTimerReset');

    // Pestanya 4: Classificació
    dom.podiumContainer = document.getElementById('podiumContainer');
    dom.leaderboardHeadRow = document.getElementById('leaderboardHeadRow');
    dom.leaderboardBody = document.getElementById('leaderboardBody');
    dom.btnPrintLeaderboard = document.getElementById('btnPrintLeaderboard');
    dom.btnExportCSV = document.getElementById('btnExportCSV');
    dom.btnExportFullJSON = document.getElementById('btnExportFullJSON');
  }

  function attachEventListeners() {
    // Canvi de pestanyes
    dom.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (!tab.disabled) switchTab(tab.dataset.tab);
      });
    });

    // Gestió de fitxers de configuració
    dom.btnLoadFile.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', handleFileInput);
    dom.btnSaveFile.addEventListener('click', exportParticipantsConfigFile);
    dom.btnLoadExample.addEventListener('click', loadDefaultExample);

    // Formulari d'afegir jugador
    dom.addParticipantForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = dom.playerNameInput.value.trim();
      const isSpecial = dom.playerSpecialInput.checked;
      if (name) {
        addParticipant(name, isSpecial, true);
        dom.playerNameInput.value = '';
        dom.playerSpecialInput.checked = false;
        dom.playerNameInput.focus();
      }
    });

    // Selecció ràpida de jugadors
    dom.btnSelectAll.addEventListener('click', () => setAllSelection(true));
    dom.btnDeselectAll.addEventListener('click', () => setAllSelection(false));
    dom.btnSelect12.addEventListener('click', () => setFirstNSelection(12));
    dom.btnSelect16.addEventListener('click', () => setFirstNSelection(16));

    // Navegació entre passos
    dom.btnProceedToConfig.addEventListener('click', () => {
      const selected = getSelectedParticipants();
      if (selected.length < 3) {
        alert('Cal seleccionar com a mínim 3 o 4 jugadors per a organitzar un torneig.');
        return;
      }
      switchTab('tab-config');
      updateConfigSummary();
    });

    dom.btnBackToParticipants.addEventListener('click', () => switchTab('tab-participants'));

    // Modal afegir en bloc
    dom.btnOpenBulkModal.addEventListener('click', () => {
      dom.bulkNamesTextarea.value = '';
      dom.bulkAddModal.showModal();
    });
    dom.btnCloseBulkModal.addEventListener('click', () => dom.bulkAddModal.close());
    dom.btnCancelBulk.addEventListener('click', () => dom.bulkAddModal.close());
    dom.btnConfirmBulk.addEventListener('click', handleBulkAdd);

    // Modal de parelles inseparables
    if (dom.btnOpenPairModal) {
      dom.btnOpenPairModal.addEventListener('click', openPairModal);
      dom.btnClosePairModal.addEventListener('click', () => dom.pairModal.close());
      dom.btnClosePairModalBottom.addEventListener('click', () => dom.pairModal.close());
      dom.btnCreatePair.addEventListener('click', handleCreatePair);
    }

    // Modal d'intercanvi
    dom.btnCloseSwapModal.addEventListener('click', () => dom.swapModal.close());
    dom.btnCancelSwap.addEventListener('click', () => dom.swapModal.close());
    dom.btnConfirmSwap.addEventListener('click', handleConfirmSwap);

    // Configuració del torneig
    dom.tableSizeSelect.addEventListener('change', updateConfigSummary);
    dom.numRoundsInput.addEventListener('change', updateConfigSummary);
    dom.btnGenerateTournament.addEventListener('click', handleStartTournament);

    // Controls de ronda
    dom.btnPrevRound.addEventListener('click', () => changeRound(-1));
    dom.btnNextRound.addEventListener('click', () => changeRound(1));
    dom.btnSaveCurrentScores.addEventListener('click', saveCurrentRoundScores);
    dom.btnProjectorMode.addEventListener('click', toggleProjectorMode);

    // Temporitzador
    dom.btnTimerToggle.addEventListener('click', toggleTimer);
    dom.btnTimerReset.addEventListener('click', resetTimer);

    // Exportacions
    dom.btnPrintLeaderboard.addEventListener('click', () => window.print());
    dom.btnExportCSV.addEventListener('click', exportLeaderboardCSV);
    dom.btnExportFullJSON.addEventListener('click', exportFullTournamentJSON);
  }

  // ==========================================================================
  // PERSISTÈNCIA & CÀRREGA DE DADES
  // ==========================================================================

  function loadStoredData() {
    // 1. Carregar cens
    const storedPool = localStorage.getItem(STORAGE_KEYS.POOL);
    if (storedPool) {
      try {
        state.pool = JSON.parse(storedPool);
      } catch (err) {
        console.error('Error llegint pool de localStorage', err);
      }
    }

    // Si el cens és buit, carreguem els 16 jugadors d'exemple inicialment
    if (!state.pool || state.pool.length === 0) {
      loadDefaultExampleData();
    }

    // 2. Carregar torneig si ja n'hi ha un d'actiu
    const storedTourney = localStorage.getItem(STORAGE_KEYS.TOURNAMENT);
    if (storedTourney) {
      try {
        const t = JSON.parse(storedTourney);
        if (t && t.isActive && t.players && t.players.length > 0) {
          state.tournament = t;
          enableTournamentTabs();
          initTimer(state.tournament.config.roundMinutes);
        }
      } catch (err) {
        console.error('Error llegint torneig de localStorage', err);
      }
    }
  }

  function persistPool() {
    localStorage.setItem(STORAGE_KEYS.POOL, JSON.stringify(state.pool));
  }

  function persistTournament() {
    localStorage.setItem(STORAGE_KEYS.TOURNAMENT, JSON.stringify(state.tournament));
  }

  // ==========================================================================
  // GESTIÓ DEL CENS I FITXERS DE CONFIGURACIÓ
  // ==========================================================================

  function loadDefaultExampleData() {
    state.pool = [
      { id: 'p1', name: 'Marc', isSpecial: true, selected: true, pairId: null },
      { id: 'p2', name: 'Laia', isSpecial: true, selected: true, pairId: null },
      { id: 'p3', name: 'Jordi', isSpecial: true, selected: true, pairId: 'pair_1' },
      { id: 'p4', name: 'Mireia', isSpecial: false, selected: true, pairId: 'pair_1' },
      { id: 'p5', name: 'Pau', isSpecial: false, selected: true, pairId: null },
      { id: 'p6', name: 'Anna', isSpecial: false, selected: true, pairId: null },
      { id: 'p7', name: 'Oriol', isSpecial: false, selected: true, pairId: null },
      { id: 'p8', name: 'Clara', isSpecial: false, selected: true, pairId: null },
      { id: 'p9', name: 'Pol', isSpecial: false, selected: true, pairId: null },
      { id: 'p10', name: 'Núria', isSpecial: false, selected: true, pairId: null },
      { id: 'p11', name: 'Arnau', isSpecial: false, selected: true, pairId: null },
      { id: 'p12', name: 'Berta', isSpecial: false, selected: true, pairId: null },
      { id: 'p13', name: 'David', isSpecial: false, selected: false, pairId: null },
      { id: 'p14', name: 'Laura', isSpecial: false, selected: false, pairId: null },
      { id: 'p15', name: 'Sergi', isSpecial: false, selected: false, pairId: null },
      { id: 'p16', name: 'Judit', isSpecial: false, selected: false, pairId: null }
    ];
    persistPool();
  }

  function loadDefaultExample() {
    if (confirm('Vols carregar la llista de mostra de 16 participants (inclou Jordi i Mireia com a parella d\'exemple)?')) {
      loadDefaultExampleData();
      renderParticipantsPool();
    }
  }

  function addParticipant(name, isSpecial = false, selected = true, pairId = null) {
    const newParticipant = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name,
      isSpecial: Boolean(isSpecial),
      selected: Boolean(selected),
      pairId: pairId || null
    };
    state.pool.push(newParticipant);
    persistPool();
    renderParticipantsPool();
  }

  function removeParticipant(id) {
    const p = state.pool.find(item => item.id === id);
    if (p && p.pairId) {
      const partner = getPartner(p.id);
      if (partner) partner.pairId = null;
    }
    state.pool = state.pool.filter(item => item.id !== id);
    persistPool();
    renderParticipantsPool();
  }

  function toggleParticipantSpecial(id) {
    const p = state.pool.find(item => item.id === id);
    if (p) {
      p.isSpecial = !p.isSpecial;
      persistPool();
      renderParticipantsPool();
    }
  }

  function setParticipantSelected(id, isSelected) {
    const p = state.pool.find(item => item.id === id);
    if (p) {
      p.selected = isSelected;
      // Sincronitzar la parella: si un és seleccionat, l'altre també
      if (p.pairId) {
        const partner = getPartner(p.id);
        if (partner) {
          partner.selected = isSelected;
        }
      }
      persistPool();
      renderParticipantsPool();
    }
  }

  function setAllSelection(selected) {
    state.pool.forEach(p => p.selected = selected);
    persistPool();
    renderParticipantsPool();
  }

  function setFirstNSelection(n) {
    state.pool.forEach((p, idx) => {
      p.selected = idx < n;
    });
    // Assegurar coherència de parelles
    state.pool.forEach(p => {
      if (p.pairId && p.selected) {
        const partner = getPartner(p.id);
        if (partner) partner.selected = true;
      }
    });
    persistPool();
    renderParticipantsPool();
  }

  function getSelectedParticipants() {
    return state.pool.filter(p => p.selected);
  }

  // ==========================================================================
  // GESTIÓ DE PARELLES INSEPARABLES
  // ==========================================================================

  function getPartner(playerId, pool = state.pool) {
    const p = pool.find(item => item.id === playerId);
    if (!p || !p.pairId) return null;
    return pool.find(item => item.id !== playerId && item.pairId === p.pairId) || null;
  }

  function getAllPairs(pool = state.pool) {
    const map = new Map();
    pool.forEach(p => {
      if (p.pairId) {
        if (!map.has(p.pairId)) map.set(p.pairId, []);
        map.get(p.pairId).push(p);
      }
    });
    const pairs = [];
    map.forEach((members, pairId) => {
      if (members.length >= 2) {
        pairs.push({ pairId, player1: members[0], player2: members[1] });
      }
    });
    return pairs;
  }

  function createPair(id1, id2) {
    if (!id1 || !id2 || id1 === id2) return;
    const p1 = state.pool.find(p => p.id === id1);
    const p2 = state.pool.find(p => p.id === id2);
    if (!p1 || !p2) return;

    const pairId = 'pair_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    p1.pairId = pairId;
    p2.pairId = pairId;

    // Si un dels dos estava seleccionat per al torneig, seleccionem tots dos
    if (p1.selected || p2.selected) {
      p1.selected = true;
      p2.selected = true;
    }

    persistPool();
    renderParticipantsPool();
    populatePairModal();
  }

  function removePair(pairId) {
    state.pool.forEach(p => {
      if (p.pairId === pairId) p.pairId = null;
    });
    persistPool();
    renderParticipantsPool();
    populatePairModal();
  }

  function openPairModal() {
    populatePairModal();
    dom.pairModal.showModal();
  }

  function populatePairModal() {
    // Participants que NO tenen parella actualment
    const availablePlayers = state.pool.filter(p => !p.pairId);

    dom.pairSelect1.innerHTML = '<option value="">-- Tria jugador 1 --</option>';
    dom.pairSelect2.innerHTML = '<option value="">-- Tria jugador 2 --</option>';

    availablePlayers.forEach(p => {
      const opt1 = document.createElement('option');
      opt1.value = p.id;
      opt1.textContent = `${p.name} ${p.isSpecial ? '(⭐)' : ''}`;
      dom.pairSelect1.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = p.id;
      opt2.textContent = `${p.name} ${p.isSpecial ? '(⭐)' : ''}`;
      dom.pairSelect2.appendChild(opt2);
    });

    // Llista de parelles existents
    const pairs = getAllPairs();
    dom.existingPairsList.innerHTML = '';

    if (pairs.length === 0) {
      dom.existingPairsList.innerHTML = '<p class="text-muted" style="font-size:0.85rem">Encara no hi ha cap parella formada.</p>';
    } else {
      pairs.forEach(pair => {
        const item = document.createElement('div');
        item.className = 'existing-pair-item';

        const names = document.createElement('span');
        names.className = 'existing-pair-names';
        names.innerHTML = `<span>🔗</span> ${pair.player1.name} & ${pair.player2.name}`;

        const btnUnpair = document.createElement('button');
        btnUnpair.className = 'btn btn-sm btn-danger-ghost';
        btnUnpair.textContent = 'Desvincular';
        btnUnpair.addEventListener('click', () => removePair(pair.pairId));

        item.appendChild(names);
        item.appendChild(btnUnpair);
        dom.existingPairsList.appendChild(item);
      });
    }
  }

  function handleCreatePair() {
    const id1 = dom.pairSelect1.value;
    const id2 = dom.pairSelect2.value;

    if (!id1 || !id2) {
      alert('Has de seleccionar dos participants diferents.');
      return;
    }
    if (id1 === id2) {
      alert('No pots emparellar un jugador amb si mateix.');
      return;
    }

    createPair(id1, id2);
  }

  // Afegir en bloc mitjançant textarea
  function handleBulkAdd() {
    const text = dom.bulkNamesTextarea.value.trim();
    if (!text) {
      dom.bulkAddModal.close();
      return;
    }

    const lines = text.split('\n');
    let addedCount = 0;

    lines.forEach(line => {
      let trimmed = line.trim();
      if (!trimmed) return;
      let isSpecial = false;
      if (trimmed.endsWith('*')) {
        isSpecial = true;
        trimmed = trimmed.substring(0, trimmed.length - 1).trim();
      }
      if (trimmed) {
        state.pool.push({
          id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: trimmed,
          isSpecial: isSpecial,
          selected: true,
          pairId: null
        });
        addedCount++;
      }
    });

    persistPool();
    dom.bulkAddModal.close();
    renderParticipantsPool();
    alert(`S'han afegit ${addedCount} participants nous al cens!`);
  }

  // Exportar fitxer de configuració JSON al disc
  function exportParticipantsConfigFile() {
    const exportData = state.pool.map(p => ({
      id: p.id,
      name: p.name,
      isSpecial: p.isSpecial,
      selected: p.selected,
      pairId: p.pairId || null
    }));

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'participants_torneig.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Carregar fitxer de configuració del disc (JSON o TXT)
  function handleFileInput(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const content = evt.target.result;
        let loadedList = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            loadedList = parsed.map((item, idx) => {
              if (typeof item === 'string') {
                return {
                  id: 'p_' + Date.now() + '_' + idx,
                  name: item,
                  isSpecial: false,
                  selected: true,
                  pairId: null
                };
              } else if (item && item.name) {
                return {
                  id: item.id || ('p_' + Date.now() + '_' + idx),
                  name: item.name,
                  isSpecial: Boolean(item.isSpecial),
                  selected: item.selected !== undefined ? Boolean(item.selected) : true,
                  pairId: item.pairId || null
                };
              }
              return null;
            }).filter(Boolean);
          }
        } else {
          // Format TXT: un nom per línia
          const lines = content.split('\n');
          loadedList = lines.map((line, idx) => {
            let t = line.trim();
            if (!t) return null;
            let isSpecial = false;
            if (t.endsWith('*')) {
              isSpecial = true;
              t = t.substring(0, t.length - 1).trim();
            }
            return {
              id: 'p_' + Date.now() + '_' + idx,
              name: t,
              isSpecial: isSpecial,
              selected: true,
              pairId: null
            };
          }).filter(Boolean);
        }

        if (loadedList.length > 0) {
          state.pool = loadedList;
          persistPool();
          renderParticipantsPool();
          alert(`S'han carregat correctament ${loadedList.length} participants des del fitxer.`);
        } else {
          alert('No s\'ha pogut reconèixer cap participant vàlid al fitxer.');
        }
      } catch (err) {
        alert('Error llegint el fitxer: ' + err.message);
      } finally {
        dom.fileInput.value = '';
      }
    };
    reader.readAsText(file);
  }

  // ==========================================================================
  // RENDERITZAT: PARTICIPANTS
  // ==========================================================================

  function renderParticipantsPool() {
    dom.participantsList.innerHTML = '';
    state.pool.forEach(p => {
      const item = document.createElement('div');
      item.className = 'participant-item' + (p.selected ? ' selected' : '');

      const left = document.createElement('div');
      left.className = 'participant-left';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'participant-checkbox';
      chk.checked = p.selected;
      chk.title = 'Marcar per participar en aquest torneig';
      chk.addEventListener('change', (e) => {
        setParticipantSelected(p.id, e.target.checked);
      });

      const info = document.createElement('div');
      info.className = 'participant-info';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'participant-name';
      nameSpan.textContent = p.name;
      info.appendChild(nameSpan);

      // Fila d'etiquetes (rol especial i parella)
      const badgesRow = document.createElement('div');
      badgesRow.className = 'participant-badges-row';

      // Distintiu de Rol especial
      const roleBadge = document.createElement('span');
      roleBadge.className = 'participant-role-badge';
      roleBadge.innerHTML = p.isSpecial ? '⭐ Rol especial' : '☆ Normal';
      roleBadge.title = 'Fes clic per canviar el rol especial';
      roleBadge.style.opacity = p.isSpecial ? '1' : '0.65';
      roleBadge.addEventListener('click', () => toggleParticipantSpecial(p.id));
      badgesRow.appendChild(roleBadge);

      // Distintiu de Parella si en té
      const partner = getPartner(p.id);
      if (partner) {
        const pairBadge = document.createElement('span');
        pairBadge.className = 'participant-pair-badge';
        pairBadge.innerHTML = `<span>🔗 Amb ${partner.name}</span> <span class="unpair-x" title="Desvincular parella">&times;</span>`;
        
        pairBadge.querySelector('.unpair-x').addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (confirm(`Vols desvincular la parella entre ${p.name} i ${partner.name}?`)) {
            removePair(p.pairId);
          }
        });
        badgesRow.appendChild(pairBadge);
      }

      info.appendChild(badgesRow);

      left.appendChild(chk);
      left.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'participant-actions';

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-danger-ghost';
      btnDelete.innerHTML = '🗑️';
      btnDelete.title = 'Eliminar participant del cens';
      btnDelete.addEventListener('click', () => {
        if (confirm(`Vols eliminar "${p.name}" del cens de jugadors?`)) {
          removeParticipant(p.id);
        }
      });

      actions.appendChild(btnDelete);

      item.appendChild(left);
      item.appendChild(actions);

      dom.participantsList.appendChild(item);
    });

    updateSelectionCounts();
  }

  function updateSelectionCounts() {
    const selected = getSelectedParticipants();
    const count = selected.length;
    const specialCount = selected.filter(p => p.isSpecial).length;
    const pairsCount = getAllPairs().length;

    dom.selectedCount.textContent = count;
    dom.totalPoolCount.textContent = state.pool.length;
    dom.specialSelectedCount.textContent = specialCount;
    if (dom.pairsCount) dom.pairsCount.textContent = pairsCount;

    // Suggeriment de taules
    const tableSize = parseInt(dom.tableSizeSelect?.value || 4, 10);
    const mod = count % tableSize;
    if (count === 0) {
      dom.noticeText.textContent = 'Selecciona almenys 4 jugadors per a poder configurar el torneig.';
      dom.selectionNotice.className = 'alert alert-info';
    } else if (mod === 0) {
      const numTables = count / tableSize;
      dom.noticeText.textContent = `Perfecte! Amb ${count} jugadors es formaran exactament ${numTables} taules de ${tableSize} jugadors.`;
      dom.selectionNotice.className = 'alert alert-info';
    } else {
      const needed = tableSize - mod;
      dom.noticeText.textContent = `Tens ${count} jugadors seleccionats. Amb taules de ${tableSize}, la darrera taula tindrà ${mod} jugadors (o afegeix-ne ${needed} més).`;
      dom.selectionNotice.className = 'alert alert-info';
    }
  }

  // ==========================================================================
  // CONFIGURACIÓ DEL TORNEIG (PESTANYA 2)
  // ==========================================================================

  function updateConfigSummary() {
    const selected = getSelectedParticipants();
    const count = selected.length;
    const tableSize = parseInt(dom.tableSizeSelect.value, 10);
    const numTables = Math.max(1, Math.ceil(count / tableSize));

    dom.cfgPlayerCount.textContent = count;
    dom.cfgPlayersPerTable.textContent = tableSize;
    dom.cfgTableCount.textContent = numTables;

    // Generar inputs per als jocs de cada taula
    dom.tableGamesList.innerHTML = '';
    for (let t = 0; t < numTables; t++) {
      const card = document.createElement('div');
      card.className = 'table-game-card';

      const lbl = document.createElement('label');
      lbl.textContent = `Joc per a la Taula ${t + 1}`;

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'form-control table-game-input';
      inp.dataset.tableIndex = t;
      const defaultGame = DEFAULT_GAME_SUGGESTIONS[t % DEFAULT_GAME_SUGGESTIONS.length] || `Joc ${t + 1}`;
      inp.value = (state.tournament.config.games && state.tournament.config.games[t]) || defaultGame;

      card.appendChild(lbl);
      card.appendChild(inp);
      dom.tableGamesList.appendChild(card);
    }
  }

  // ==========================================================================
  // MOTOR D'ASSIGNACIÓ I EMPARELLAMENTS DE RONDES
  // ==========================================================================

  function handleStartTournament() {
    const selected = getSelectedParticipants();
    if (selected.length < 3) {
      alert('Es necessiten com a mínim 3 o 4 participants seleccionats.');
      return;
    }

    const tableSize = parseInt(dom.tableSizeSelect.value, 10);
    const numRounds = parseInt(dom.numRoundsInput.value, 10) || 3;
    const roundMinutes = parseInt(dom.roundMinutesInput.value, 10) || 45;
    const numTables = Math.ceil(selected.length / tableSize);

    // Recollir jocs
    const gameInputs = dom.tableGamesList.querySelectorAll('.table-game-input');
    const games = Array.from(gameInputs).map((inp, idx) => inp.value.trim() || `Joc ${idx + 1}`);

    // Crear llista de jugadors per al torneig actiu amb pairId inclòs
    const tournamentPlayers = selected.map((p, idx) => {
      return {
        id: p.id,
        name: p.name,
        isSpecial: Boolean(p.isSpecial),
        badgeNumber: idx + 1,
        pairId: p.pairId || null,
        scores: Array(numRounds).fill(null)
      };
    });

    state.tournament = {
      isActive: true,
      players: tournamentPlayers,
      config: {
        tableSize: tableSize,
        numRounds: numRounds,
        roundMinutes: roundMinutes,
        numTables: numTables,
        games: games
      },
      currentRound: 1,
      assignments: []
    };

    // Generar Ronda 1
    const r1 = generateRoundAssignment(0, tournamentPlayers, numTables, tableSize, []);
    if (!r1) {
      alert('No s\'ha pogut generar una assignació inicial vàlida.');
      return;
    }
    state.tournament.assignments[0] = r1;

    // Generar la resta de rondes
    for (let r = 1; r < numRounds; r++) {
      const rAss = generateRoundAssignment(r, tournamentPlayers, numTables, tableSize, state.tournament.assignments);
      state.tournament.assignments[r] = rAss;
    }

    persistTournament();
    enableTournamentTabs();
    initTimer(roundMinutes);

    switchTab('tab-rounds');
    renderRoundView();
    renderLeaderboardView();
  }

  /**
   * Genera l'assignació de taules per a una ronda concreta complint:
   * 1. PARELLES INSEPARABLES: Els participants que formen una parella van SEMPRE a la mateixa taula.
   * 2. Rols especials en taules diferents.
   * 3. Rotació de taules respecte a rondes anteriors.
   * 4. Minimitzar repetició de companys fora de la parella.
   */
  function generateRoundAssignment(roundIdx, players, numTables, tableSize, prevAssignments) {
    const P = players.length;

    // Històric de companys i taules visitades
    const pairHistory = new Set();
    const tableVisits = Array.from({ length: P }, () => new Set());

    for (let r = 0; r < roundIdx; r++) {
      const ass = prevAssignments[r];
      if (!ass) continue;
      for (let pid = 0; pid < P; pid++) {
        tableVisits[pid].add(ass[pid]);
      }
      for (let t = 0; t < numTables; t++) {
        const mem = [];
        for (let pid = 0; pid < P; pid++) {
          if (ass[pid] === t) mem.push(pid);
        }
        for (let i = 0; i < mem.length; i++) {
          for (let j = i + 1; j < mem.length; j++) {
            const a = Math.min(mem[i], mem[j]);
            const b = Math.max(mem[i], mem[j]);
            pairHistory.add(a + '-' + b);
          }
        }
      }
    }

    // 1. Agrupar jugadors en Entitats (Parelles de mida 2 o Individuals de mida 1)
    const entities = [];
    const visitedPids = new Set();

    const pairMap = new Map();
    players.forEach((p, idx) => {
      if (p.pairId) {
        if (!pairMap.has(p.pairId)) pairMap.set(p.pairId, []);
        pairMap.get(p.pairId).push(idx);
      }
    });

    // Afegir primer les parelles com a blocs de 2 jugadors
    pairMap.forEach((pids) => {
      if (pids.length >= 2) {
        entities.push({
          type: 'pair',
          pids: [pids[0], pids[1]],
          isSpecial: Boolean(players[pids[0]].isSpecial || players[pids[1]].isSpecial)
        });
        visitedPids.add(pids[0]);
        visitedPids.add(pids[1]);
      }
    });

    // Afegir la resta de jugadors individuals
    players.forEach((p, idx) => {
      if (!visitedPids.has(idx)) {
        entities.push({
          type: 'single',
          pids: [idx],
          isSpecial: Boolean(p.isSpecial)
        });
        visitedPids.add(idx);
      }
    });

    // Capacitats de taula
    const maxCapacity = Math.ceil(P / numTables);

    // Heurística d'ordenació d'entitats per al backtracking:
    // 1. Rols especials primer
    // 2. Parelles (mida 2) abans que individuals (mida 1) per optimització d'espai
    // 3. Entitats amb més taules visitades
    const order = [...entities].sort((ea, eb) => {
      const sa = ea.isSpecial ? 1 : 0;
      const sb = eb.isSpecial ? 1 : 0;
      if (sb !== sa) return sb - sa;

      const sizeDiff = eb.pids.length - ea.pids.length;
      if (sizeDiff !== 0) return sizeDiff;

      const visitsA = Math.max(...ea.pids.map(pid => tableVisits[pid].size));
      const visitsB = Math.max(...eb.pids.map(pid => tableVisits[pid].size));
      return visitsB - visitsA;
    });

    function solve(allowRepeats = false) {
      const assigned = Array(P).fill(-1);
      const tableMembers = Array.from({ length: numTables }, () => []);

      function canPlace(ent, t) {
        // Capacitat: comprovar si caben tots els membres de l'entitat a la taula t
        if (tableMembers[t].length + ent.pids.length > maxCapacity) return false;

        // Rols especials: màxim 1 rol especial per taula
        if (ent.isSpecial) {
          for (const q of tableMembers[t]) {
            if (players[q].isSpecial) return false;
          }
        }

        if (!allowRepeats) {
          // Rotació de taules: cap membre de l'entitat hauria d'haver visitat la taula t
          for (const pid of ent.pids) {
            if (tableVisits[pid].has(t) && tableVisits[pid].size < numTables) {
              return false;
            }
          }

          // Varietat de companys: cap membre de l'entitat ha de repetir company fora de la pròpia entitat
          for (const pid of ent.pids) {
            for (const q of tableMembers[t]) {
              if (ent.pids.includes(q)) continue;
              const a = Math.min(pid, q);
              const b = Math.max(pid, q);
              if (pairHistory.has(a + '-' + b)) return false;
            }
          }
        }

        return true;
      }

      function backtrack(idx) {
        if (idx === order.length) return true;
        const ent = order[idx];

        // Ordenar taules per provar primer aquelles que l'entitat no ha visitat
        const tablesToTry = [...Array(numTables).keys()].sort((t1, t2) => {
          const visited1 = ent.pids.some(pid => tableVisits[pid].has(t1)) ? 1 : 0;
          const visited2 = ent.pids.some(pid => tableVisits[pid].has(t2)) ? 1 : 0;
          if (visited1 !== visited2) return visited1 - visited2;
          return tableMembers[t1].length - tableMembers[t2].length;
        });

        for (const t of tablesToTry) {
          if (!canPlace(ent, t)) continue;

          // Col·locar tots els membres de l'entitat (la parella o individual) a la taula t
          ent.pids.forEach(pid => {
            assigned[pid] = t;
            tableMembers[t].push(pid);
          });

          if (backtrack(idx + 1)) return true;

          // Desfer el pas
          ent.pids.forEach(pid => {
            assigned[pid] = -1;
            tableMembers[t].pop();
          });
        }
        return false;
      }

      const success = backtrack(0);
      return success ? assigned : null;
    }

    // Intent 1: estricte sense repetir companys ni taules (i parelles juntes)
    let result = solve(false);
    if (!result) {
      // Intent 2: relaxat (permet repetir companys/taula si cal, PERÒ PARELLES SEMPRE JUNTES)
      result = solve(true);
    }

    // Fallback garantit: distribució per entitats equilibrant taules
    if (!result) {
      result = Array(P).fill(-1);
      const counts = Array(numTables).fill(0);
      order.forEach(ent => {
        let bestT = 0;
        for (let t = 1; t < numTables; t++) {
          if (counts[t] < counts[bestT]) bestT = t;
        }
        ent.pids.forEach(pid => {
          result[pid] = bestT;
          counts[bestT]++;
        });
      });
    }

    return result;
  }

  // ==========================================================================
  // RENDERITZAT: RONDES & TAULES
  // ==========================================================================

  function renderRoundView() {
    const t = state.tournament;
    if (!t.isActive) return;

    dom.roundIndicator.textContent = `Ronda ${t.currentRound}`;
    dom.roundTotalSub.textContent = `de ${t.config.numRounds} rondes`;

    dom.btnPrevRound.disabled = t.currentRound <= 1;
    dom.btnNextRound.disabled = t.currentRound >= t.config.numRounds;

    const currentAssignment = t.assignments[t.currentRound - 1];
    if (!currentAssignment) return;

    dom.roundTablesContainer.innerHTML = '';

    // Agrupar jugadors per taula
    const tables = Array.from({ length: t.config.numTables }, () => []);
    t.players.forEach((p, idx) => {
      const tableIdx = currentAssignment[idx];
      if (tables[tableIdx]) {
        tables[tableIdx].push({ player: p, playerIndex: idx });
      }
    });

    tables.forEach((tableData, tableIdx) => {
      const card = document.createElement('div');
      card.className = 'table-card';

      const header = document.createElement('div');
      header.className = 'table-card-header';

      // Nom del joc a l'esquerra (més visible i destacat)
      const gameTitle = document.createElement('h3');
      gameTitle.className = 'table-game-title';
      gameTitle.textContent = t.config.games[tableIdx] || `Joc ${tableIdx + 1}`;

      // Literal "Taula n" a la dreta (menys destacat)
      const tableTag = document.createElement('span');
      tableTag.className = 'table-number-badge';
      tableTag.textContent = `Taula ${tableIdx + 1}`;

      header.appendChild(gameTitle);
      header.appendChild(tableTag);
      card.appendChild(header);

      const seatsList = document.createElement('div');
      seatsList.className = 'seats-list';

      tableData.forEach((item, seatIdx) => {
        const p = item.player;
        const playerIdx = item.playerIndex;

        const row = document.createElement('div');
        row.className = 'seat-row';

        // Insígnia visual
        const badgeStyle = BADGE_STYLES[seatIdx % BADGE_STYLES.length];
        const badge = document.createElement('div');
        badge.className = `badge-shape ${badgeStyle.shape} ${badgeStyle.color}`;
        badge.textContent = p.badgeNumber;
        badge.title = `Seient ${seatIdx + 1}`;

        // Info jugador
        const info = document.createElement('div');
        info.className = 'seat-info';

        const name = document.createElement('div');
        name.className = 'seat-player-name' + (p.isSpecial ? ' special' : '');
        name.textContent = p.name + (p.isSpecial ? ' ⭐' : '');

        // Indicador si forma part d'una parella
        const partner = p.pairId ? t.players.find(other => other.id !== p.id && other.pairId === p.pairId) : null;
        let pairTag = '';
        if (partner) {
          pairTag = `<span class="seat-pair-tag">🔗 Parella amb ${partner.name}</span>`;
        }

        const meta = document.createElement('div');
        meta.className = 'seat-pos-label';
        meta.innerHTML = `Posició ${p.badgeNumber} ${pairTag}`;

        info.appendChild(name);
        info.appendChild(meta);

        // Input de puntuació
        const scoreInput = document.createElement('input');
        scoreInput.type = 'number';
        scoreInput.step = 'any';
        scoreInput.placeholder = 'Punts';
        scoreInput.className = 'seat-score-input';
        const existingScore = p.scores[t.currentRound - 1];
        scoreInput.value = existingScore !== null && existingScore !== undefined ? existingScore : '';
        scoreInput.dataset.playerIdx = playerIdx;

        // Auto-desa en canviar
        scoreInput.addEventListener('input', () => {
          const val = scoreInput.value.trim();
          p.scores[t.currentRound - 1] = val === '' ? null : parseFloat(val);
          persistTournament();
          renderLeaderboardView();
        });

        // Botó d'intercanvi
        const swapBtn = document.createElement('button');
        swapBtn.className = 'seat-swap-btn';
        swapBtn.innerHTML = '⇄';
        swapBtn.title = 'Intercanviar lloc';
        swapBtn.addEventListener('click', () => openSwapModal(p.id));

        row.appendChild(badge);
        row.appendChild(info);
        row.appendChild(scoreInput);
        row.appendChild(swapBtn);

        seatsList.appendChild(row);
      });

      card.appendChild(seatsList);
      dom.roundTablesContainer.appendChild(card);
    });
  }

  function changeRound(delta) {
    saveCurrentRoundScores(false);
    const newRound = state.tournament.currentRound + delta;
    if (newRound >= 1 && newRound <= state.tournament.config.numRounds) {
      state.tournament.currentRound = newRound;
      persistTournament();
      renderRoundView();
      renderLeaderboardView();
    }
  }

  function saveCurrentRoundScores(showAlert = true) {
    const inputs = dom.roundTablesContainer.querySelectorAll('.seat-score-input');
    inputs.forEach(input => {
      const idx = parseInt(input.dataset.playerIdx, 10);
      const val = input.value.trim();
      if (state.tournament.players[idx]) {
        state.tournament.players[idx].scores[state.tournament.currentRound - 1] = val === '' ? null : parseFloat(val);
      }
    });
    persistTournament();
    renderLeaderboardView();
    if (showAlert) {
      alert(`Puntuacions desades correctament per a la Ronda ${state.tournament.currentRound}!`);
    }
  }

  // ==========================================================================
  // INTERCANVI DE JUGADORS (MODAL)
  // ==========================================================================

  function openSwapModal(playerId) {
    const p = state.tournament.players.find(x => x.id === playerId);
    if (!p) return;

    state.swapSourcePlayerId = playerId;
    const partner = p.pairId ? state.tournament.players.find(x => x.id !== p.id && x.pairId === p.pairId) : null;

    if (partner) {
      dom.swapPlayerSourceName.innerHTML = `${p.name} <span class="seat-pair-tag">🔗 Parella amb ${partner.name} (es mouran junts)</span>`;
    } else {
      dom.swapPlayerSourceName.textContent = p.name;
    }

    dom.swapTargetSelect.innerHTML = '<option value="">-- Selecciona un jugador o parella --</option>';

    const currentRoundIdx = state.tournament.currentRound - 1;
    const sourceTable = state.tournament.assignments[currentRoundIdx][state.tournament.players.indexOf(p)];

    state.tournament.players.forEach(other => {
      if (other.id !== playerId && (!partner || other.id !== partner.id)) {
        const otherPartner = other.pairId ? state.tournament.players.find(x => x.id !== other.id && x.pairId === other.pairId) : null;
        const otherIdx = state.tournament.players.indexOf(other);
        const otherTable = state.tournament.assignments[currentRoundIdx][otherIdx];

        // Si el jugador orígen està en parella, preferim intercanviar amb una altra parella si canvia de taula
        let label = `${other.name} (Taula ${otherTable + 1}, nº ${other.badgeNumber}${other.isSpecial ? ' ⭐' : ''})`;
        if (otherPartner) {
          label += ` [🔗 Parella amb ${otherPartner.name}]`;
        }

        const opt = document.createElement('option');
        opt.value = other.id;
        opt.textContent = label;
        dom.swapTargetSelect.appendChild(opt);
      }
    });

    dom.swapModal.showModal();
  }

  function handleConfirmSwap() {
    const sourceId = state.swapSourcePlayerId;
    const targetId = dom.swapTargetSelect.value;

    if (!targetId) {
      alert('Has de seleccionar un altre jugador per a fer l\'intercanvi.');
      return;
    }

    const t = state.tournament;
    const rIdx = t.currentRound - 1;
    const sourceIdx = t.players.findIndex(p => p.id === sourceId);
    const targetIdx = t.players.findIndex(p => p.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) {
      dom.swapModal.close();
      return;
    }

    const sourcePlayer = t.players[sourceIdx];
    const targetPlayer = t.players[targetIdx];

    const sourcePartner = sourcePlayer.pairId ? t.players.find(p => p.id !== sourcePlayer.id && p.pairId === sourcePlayer.pairId) : null;
    const targetPartner = targetPlayer.pairId ? t.players.find(p => p.id !== targetPlayer.id && p.pairId === targetPlayer.pairId) : null;

    const sourcePartnerIdx = sourcePartner ? t.players.indexOf(sourcePartner) : -1;
    const targetPartnerIdx = targetPartner ? t.players.indexOf(targetPartner) : -1;

    const sourceTable = t.assignments[rIdx][sourceIdx];
    const targetTable = t.assignments[rIdx][targetIdx];

    // Si ambdós tenen parella i són a taules diferents, intercanviem ambdues parelles completes
    if (sourcePartner && targetPartner && sourceTable !== targetTable) {
      t.assignments[rIdx][sourceIdx] = targetTable;
      t.assignments[rIdx][sourcePartnerIdx] = targetTable;
      t.assignments[rIdx][targetIdx] = sourceTable;
      t.assignments[rIdx][targetPartnerIdx] = sourceTable;
    } else if (sourcePartner && !targetPartner && sourceTable !== targetTable) {
      // Origen en parella i destí individual a taula diferent:
      // Moguda de parella: busquem un segon jugador individual a la taula destí per equilibrar
      const destinationMembers = [];
      t.assignments[rIdx].forEach((tbl, idx) => {
        if (tbl === targetTable && idx !== targetIdx) destinationMembers.push(idx);
      });
      const secondTargetIdx = destinationMembers.find(idx => !t.players[idx].pairId);

      if (secondTargetIdx !== undefined) {
        t.assignments[rIdx][sourceIdx] = targetTable;
        t.assignments[rIdx][sourcePartnerIdx] = targetTable;
        t.assignments[rIdx][targetIdx] = sourceTable;
        t.assignments[rIdx][secondTargetIdx] = sourceTable;
      } else {
        // Intercanvi directe de seients
        const tempTable = t.assignments[rIdx][sourceIdx];
        t.assignments[rIdx][sourceIdx] = t.assignments[rIdx][targetIdx];
        t.assignments[rIdx][targetIdx] = tempTable;
      }
    } else {
      // Intercanvi habitual
      const tempTable = t.assignments[rIdx][sourceIdx];
      t.assignments[rIdx][sourceIdx] = t.assignments[rIdx][targetIdx];
      t.assignments[rIdx][targetIdx] = tempTable;
    }

    persistTournament();
    dom.swapModal.close();
    renderRoundView();
  }

  // ==========================================================================
  // RENDERITZAT: CLASSIFICACIÓ & PODI
  // ==========================================================================

  function renderLeaderboardView() {
    const t = state.tournament;
    if (!t.isActive) return;

    // Calcular punts totals
    const rankedPlayers = t.players.map(p => {
      const total = p.scores.reduce((sum, score) => sum + (score !== null ? score : 0), 0);
      return { ...p, totalScore: total };
    });

    // Ordenar de major a menor puntuació
    rankedPlayers.sort((a, b) => b.totalScore - a.totalScore);

    // 1. Renderitzar Podi (Top 3)
    dom.podiumContainer.innerHTML = '';
    if (rankedPlayers.length >= 3) {
      const podiumGrid = document.createElement('div');
      podiumGrid.className = 'podium-grid';

      const medals = [
        { rank: 1, class: 'first', medal: '🥇', label: '1r Lloc' },
        { rank: 2, class: 'second', medal: '🥈', label: '2n Lloc' },
        { rank: 3, class: 'third', medal: '🥉', label: '3r Lloc' }
      ];

      medals.forEach((m, idx) => {
        const player = rankedPlayers[idx];
        const step = document.createElement('div');
        step.className = `podium-step ${m.class}`;

        step.innerHTML = `
          <div class="podium-medal">${m.medal}</div>
          <div class="podium-name">${player.name}${player.isSpecial ? ' ⭐' : ''}</div>
          <div class="podium-score">${player.totalScore.toFixed(2)}</div>
          <div class="podium-score-lbl">Punts totals</div>
        `;
        podiumGrid.appendChild(step);
      });

      dom.podiumContainer.appendChild(podiumGrid);
    }

    // 2. Capçalera dinàmica de columnes de rondes
    dom.leaderboardHeadRow.innerHTML = `
      <th>#</th>
      <th>Participant</th>
      <th>Rol / Parella</th>
      ${Array.from({ length: t.config.numRounds }, (_, r) => `<th>R${r + 1}</th>`).join('')}
      <th>Punts Totals</th>
    `;

    // 3. Files de la taula
    dom.leaderboardBody.innerHTML = '';
    rankedPlayers.forEach((p, idx) => {
      const tr = document.createElement('tr');
      const roundTds = p.scores.map(s => `<td>${s !== null && s !== undefined ? s : '-'}</td>`).join('');

      const partner = p.pairId ? t.players.find(other => other.id !== p.id && other.pairId === p.pairId) : null;
      let roleDetails = p.isSpecial ? '<span class="participant-role-badge">⭐ Rol esp.</span> ' : '';
      if (partner) {
        roleDetails += `<span class="seat-pair-tag">🔗 Amb ${partner.name}</span>`;
      } else if (!p.isSpecial) {
        roleDetails = '<span class="text-muted">Normal</span>';
      }

      tr.innerHTML = `
        <td class="leaderboard-rank">${idx + 1}</td>
        <td class="leaderboard-name">${p.name}</td>
        <td>${roleDetails}</td>
        ${roundTds}
        <td class="leaderboard-total">${p.totalScore.toFixed(2)}</td>
      `;
      dom.leaderboardBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // TEMPORITZADOR DE SALA
  // ==========================================================================

  function initTimer(minutes) {
    state.timer.totalSeconds = minutes * 60;
    state.timer.remainingSeconds = minutes * 60;
    state.timer.isRunning = false;
    if (state.timer.intervalId) clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
    updateTimerDisplay();
  }

  function toggleTimer() {
    if (state.timer.isRunning) {
      clearInterval(state.timer.intervalId);
      state.timer.isRunning = false;
      dom.btnTimerToggle.textContent = '▶ Continuar';
      dom.btnTimerToggle.className = 'btn btn-sm btn-primary';
    } else {
      state.timer.isRunning = true;
      dom.btnTimerToggle.textContent = '⏸ Pausa';
      dom.btnTimerToggle.className = 'btn btn-sm btn-outline';
      state.timer.intervalId = setInterval(() => {
        if (state.timer.remainingSeconds > 0) {
          state.timer.remainingSeconds--;
          updateTimerDisplay();
        } else {
          clearInterval(state.timer.intervalId);
          state.timer.isRunning = false;
          playAlarmSound();
          alert('⏰ S\'ha esgotat el temps de la ronda!');
        }
      }, 1000);
    }
  }

  function resetTimer() {
    clearInterval(state.timer.intervalId);
    state.timer.isRunning = false;
    state.timer.remainingSeconds = state.timer.totalSeconds;
    dom.btnTimerToggle.textContent = '▶ Iniciar';
    dom.btnTimerToggle.className = 'btn btn-sm btn-primary';
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const total = state.timer.remainingSeconds;
    const m = Math.floor(total / 60);
    const s = total % 60;
    dom.timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    dom.timerDisplay.classList.remove('warning', 'danger');
    if (total <= 60) {
      dom.timerDisplay.classList.add('danger');
    } else if (total <= 300) {
      dom.timerDisplay.classList.add('warning');
    }
  }

  // So d'alarma sintetitzat amb Web Audio API
  function playAlarmSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.warn('Web Audio no disponible per a l\'alarma', e);
    }
  }

  // ==========================================================================
  // MODE PROJECTOR & EXPORTACIONS
  // ==========================================================================

  function toggleProjectorMode() {
    document.body.classList.toggle('projector-mode');
    if (document.body.classList.contains('projector-mode')) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  function exportLeaderboardCSV() {
    const t = state.tournament;
    if (!t.isActive) return;

    let csv = 'Posicio,Nom,Rol,Parella,' + Array.from({ length: t.config.numRounds }, (_, r) => `Ronda_${r + 1}`).join(',') + ',Punts_Totals\n';

    const ranked = t.players.map(p => {
      const total = p.scores.reduce((sum, score) => sum + (score !== null ? score : 0), 0);
      return { ...p, totalScore: total };
    }).sort((a, b) => b.totalScore - a.totalScore);

    ranked.forEach((p, idx) => {
      const partner = p.pairId ? t.players.find(other => other.id !== p.id && other.pairId === p.pairId) : null;
      const partnerName = partner ? partner.name : '';
      const roundVals = p.scores.map(s => s !== null ? s : '').join(',');
      csv += `${idx + 1},"${p.name}",${p.isSpecial ? 'Especial' : 'Normal'},"${partnerName}",${roundVals},${p.totalScore.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classificacio_torneig.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportFullTournamentJSON() {
    const jsonString = JSON.stringify(state.tournament, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resum_torneig_complet.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // NAVEGACIÓ ENTRE PESTANYES
  // ==========================================================================

  function switchTab(tabId) {
    dom.tabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    dom.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabId === 'tab-config') {
      updateConfigSummary();
    } else if (tabId === 'tab-rounds') {
      renderRoundView();
    } else if (tabId === 'tab-leaderboard') {
      renderLeaderboardView();
    }
  }

  function enableTournamentTabs() {
    dom.navRounds.disabled = false;
    dom.navLeaderboard.disabled = false;
    dom.headerStatus.innerHTML = '<span class="status-badge live">● Torneig en Curs</span>';
  }

  function renderAll() {
    renderParticipantsPool();
    if (state.tournament.isActive) {
      enableTournamentTabs();
      renderRoundView();
      renderLeaderboardView();
    }
  }

  // Inicialització al carregar el document
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

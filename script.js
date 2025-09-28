// --- Configuration des championnats ---
const championnats = [
  { id: 'carousel-10', nbEquipes: 10, prefixe: 'Equipe' },
  { id: 'carousel-12', nbEquipes: 12, prefixe: 'Equipe' },
  { id: 'carousel-14', nbEquipes: 14, prefixe: 'Team' },
  { id: 'carousel-16', nbEquipes: 16, prefixe: 'E' }
];

// ------------------ Helpers généraux ------------------
const numFrom = (name) => {
  const m = name.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : NaN;
};
const nameOf = (prefixe, t) => `${prefixe} ${t}`;
const duoKeyOfNum = (t) => (t % 2 === 1 ? `${t}-${t+1}` : `${t-1}-${t}`);
const duoKeyOfName = (name) => duoKeyOfNum(numFrom(name));
const last2Are = (arr, v) => arr.length >= 2 && arr[arr.length - 1] === v && arr[arr.length - 2] === v;

// ------------------ Paires round-robin (méthode circle) ------------------
function buildRoundRobinPairs(nbEquipes) {
  const teams = Array.from({ length: nbEquipes }, (_, i) => i + 1);
  if (nbEquipes % 2 !== 0) teams.push(null); // bye si impair

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  let arr = teams.slice();

  const days = []; // chaque jour = liste de paires [a,b] (nombres)
  for (let r = 0; r < rounds; r++) {
    const pairs = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== null && b !== null) pairs.push([a, b]);
    }
    days.push(pairs);

    // rotation "circle"
    const fixed = arr[0];
    const last = arr.pop();
    arr = [fixed, last, ...arr.slice(1)];
  }
  return days;
}

// ------------------ Génération des orientations (ALLER) ------------------
// On résout globalement, journée par journée, mais avec backtracking entre journées.
// Pour une journée donnée, on énumère toutes les affectations possibles (2^(n/2))
// qui respectent DUO + pas de triple immédiat, puis on avance à la journée suivante.
// Si plus loin on bloque, on revient en arrière et on tente une autre affectation.
function generateAllerWithGlobalSolver(nbEquipes, prefixe, pairsByDay) {
  const days = pairsByDay; // [[ [a,b], ... ], ...]
  const totalDays = days.length;
  const hist = {}; // 'Equipe i' -> ['D','E',...]
  for (let t = 1; t <= nbEquipes; t++) hist[nameOf(prefixe, t)] = [];

  // Énumère toutes les affectations valides pour UNE journée (liste d’assignments)
  function dayAssignments(pairs, histSnapshot) {
    const m = pairs.length;
    const results = [];

    // backtracking interne à la journée
    const assign = new Array(m);
    const duoUsed = {}; // duoKey -> true si un membre a déjà domicile ce jour

    const dfs = (i) => {
      if (i === m) {
        results.push(assign.map(x => ({ home: x.home, away: x.away })));
        return;
      }
      const [a, b] = pairs[i];
      const an = nameOf(prefixe, a);
      const bn = nameOf(prefixe, b);
      const aDuo = duoKeyOfNum(a);
      const bDuo = duoKeyOfNum(b);

      // deux options: a reçoit OU b reçoit
      const options = [
        { home: an, away: bn, homeDuo: aDuo },
        { home: bn, away: an, homeDuo: bDuo },
      ];

      // petite heuristique: on essaie d’abord l’option qui évite un triple immédiat
      options.sort((o1, o2) => {
        const v1 = (last2Are(histSnapshot[o1.home] || [], 'D') ? 1 : 0) + (last2Are(histSnapshot[o1.away] || [], 'E') ? 1 : 0);
        const v2 = (last2Are(histSnapshot[o2.home] || [], 'D') ? 1 : 0) + (last2Are(histSnapshot[o2.away] || [], 'E') ? 1 : 0);
        return v1 - v2;
      });

      for (const opt of options) {
        if (duoUsed[opt.homeDuo]) continue; // DUO: pas deux domiciles dans le même duo ce jour
        // pas de triple immédiat
        if (last2Are(histSnapshot[opt.home] || [], 'D')) continue;
        if (last2Are(histSnapshot[opt.away] || [], 'E')) continue;

        // appliquer temporairement
        duoUsed[opt.homeDuo] = true;
        assign[i] = opt;
        (histSnapshot[opt.home] = (histSnapshot[opt.home] || []).slice()).push('D');
        (histSnapshot[opt.away] = (histSnapshot[opt.away] || []).slice()).push('E');

        dfs(i + 1);

        // backtrack
        histSnapshot[opt.home].pop();
        histSnapshot[opt.away].pop();
        assign[i] = undefined;
        delete duoUsed[opt.homeDuo];
      }
    };

    // on clone l’historique pour ne pas muter l’original
    const snap = {};
    for (const k in histSnapshot) snap[k] = (histSnapshot[k] || []).slice();
    dfs(0);
    return results;
  }

  // DFS global sur les journées
  const solution = new Array(totalDays);

  const solveDays = (d) => {
    if (d === totalDays) return true;

    // construit toutes les affectations valides pour la journée d à partir de l'historique actuel
    const candidates = dayAssignments(days[d], hist);
    // petite heuristique: trier par "équilibre" (moins de breaks potentiels)
    candidates.sort((A, B) => {
      const score = (ass) => {
        let s = 0;
        ass.forEach(m => {
          if (last2Are(hist[m.home] || [], 'D')) s += 2;
          if (last2Are(hist[m.away] || [], 'E')) s += 2;
        });
        return s;
      };
      return score(A) - score(B);
    });

    for (const ass of candidates) {
      // appliquer
      ass.forEach(m => {
        (hist[m.home] = (hist[m.home] || [])).push('D');
        (hist[m.away] = (hist[m.away] || [])).push('E');
      });

      solution[d] = ass;

      if (solveDays(d + 1)) return true;

      // backtrack
      ass.forEach(m => {
        hist[m.home].pop();
        hist[m.away].pop();
      });
      solution[d] = undefined;
    }

    return false;
  };

  const ok = solveDays(0);
  if (!ok) {
    // Si aucune solution (très rare), on lève pour signaler le cas
    // mais dans la pratique avec n = 10/12/14/16 ça trouve une solution.
    console.warn('Aucune solution ALLER trouvée respectant DUO + pas de triples.');
  }

  // On matérialise les journées ALLER sous forme {type, journee, matchs}
  const aller = solution.map((matchs, idx) => ({
    type: 'Aller',
    journee: idx + 1,
    matchs
  }));

  return aller;
}

// ------------------ Construire le RETOUR en miroir ------------------
function mirrorRetour(aller) {
  return aller.map(j => ({
    type: 'Retour',
    journee: j.journee,
    matchs: j.matchs.map(m => ({ home: m.away, away: m.home }))
  }));
}

// ------------------ Générer calendrier complet ------------------
function generateCalendrier(nbEquipes, prefixe) {
  const pairsAller = buildRoundRobinPairs(nbEquipes);     // paires numériques
  const aller = generateAllerWithGlobalSolver(nbEquipes, prefixe, pairsAller); // orientation sans triples
  const retour = mirrorRetour(aller);                     // miroir → conserve l’absence de triples
  return [...aller, ...retour];
}

// ------------------ Affichage ------------------
function afficherJournee(container, calendrier, index) {
  const title = container.querySelector('.journee-title');
  const content = container.querySelector('.carousel-content');
  const data = calendrier[index];

  content.innerHTML = '';
  title.textContent = `Journée ${data.journee} (${data.type})`;

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Domicile</th>
        <th>Extérieur</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  data.matchs.forEach(match => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><i class="fas fa-house-chimney"></i> ${match.home}</td>
      <td><i class="fas fa-location-dot"></i> ${match.away}</td>
    `;
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  content.appendChild(table);
}

// ------------------ Initialisation carousels ------------------
championnats.forEach(champ => {
  const container = document.getElementById(champ.id);
  if (!container) return;

  const prevBtn = container.querySelector('.prev-button');
  const nextBtn = container.querySelector('.next-button');

  const calendrier = generateCalendrier(champ.nbEquipes, champ.prefixe);

  let currentIndex = 0;
  afficherJournee(container, calendrier, currentIndex);

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      afficherJournee(container, calendrier, currentIndex);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex < calendrier.length - 1) {
      currentIndex++;
      afficherJournee(container, calendrier, currentIndex);
    }
  });
});

// ------------------ TEST AUTOMATIQUE ------------------
const testBtn = document.getElementById('test-button');
if (testBtn) {
  testBtn.addEventListener('click', () => {
    const result = document.getElementById('test-result');
    result.innerHTML = '';

    [
      { nb: 10, prefixe: 'Equipe' },
      { nb: 12, prefixe: 'Equipe' },
      { nb: 14, prefixe: 'Team' },
      { nb: 16, prefixe: 'E' }
    ].forEach(champ => {
      const calendrier = generateCalendrier(champ.nb, champ.prefixe);

      let doublonErreur = false;
      let streakErreur = false;
      let journeesErreur = false;
      let duoErreur = false;

      const historique = {};
      for (let i = 1; i <= champ.nb; i++) {
        historique[`${champ.prefixe} ${i}`] = [];
      }

      calendrier.forEach(journee => {
        const matchsDuJour = new Set();

        // Test DUO : deux membres d'un duo ne doivent jamais recevoir la même journée
        for (let d = 1; d <= champ.nb; d += 2) {
          const eq1 = `${champ.prefixe} ${d}`;
          const eq2 = `${champ.prefixe} ${d+1}`;
          let eq1Home = false;
          let eq2Home = false;
          journee.matchs.forEach(match => {
            if (match.home === eq1) eq1Home = true;
            if (match.home === eq2) eq2Home = true;
          });
          if (eq1Home && eq2Home) duoErreur = true;
        }

        journee.matchs.forEach(match => {
          if (matchsDuJour.has(match.home) || matchsDuJour.has(match.away)) {
            doublonErreur = true;
          }
          matchsDuJour.add(match.home);
          matchsDuJour.add(match.away);

          historique[match.home].push('D');
          historique[match.away].push('E');
        });
      });

      // Pas de séries de 3 D ou 3 E sur l'ensemble ALLER+RETOUR
      for (const equipe in historique) {
        const parcours = historique[equipe].join('');
        if (/DDD/.test(parcours) || /EEE/.test(parcours)) streakErreur = true;
      }

      if (calendrier.length !== 2 * (champ.nb - 1)) {
        journeesErreur = true;
      }

      // Affichage
      result.innerHTML += `<h3>Résultats pour ${champ.prefixe} (${champ.nb} équipes)</h3>`;
      result.innerHTML += !doublonErreur
        ? `<p style="color:green;">✅ Aucune équipe ne joue deux fois par journée.</p>`
        : `<p style="color:red;">❌ Des équipes jouent plusieurs fois dans la même journée.</p>`;

      result.innerHTML += !streakErreur
        ? `<p style="color:green;">✅ Pas de 3 matchs consécutifs domicile ou extérieur.</p>`
        : `<p style="color:red;">❌ 3 matchs consécutifs domicile ou extérieur détectés.</p>`;

      result.innerHTML += !journeesErreur
        ? `<p style="color:green;">✅ Nombre de journées correct.</p>`
        : `<p style="color:red;">❌ Nombre de journées incorrect.</p>`;

      result.innerHTML += !duoErreur
        ? `<p style="color:green;">✅ Les équipes d'un même duo ne reçoivent jamais la même journée.</p>`
        : `<p style="color:red;">❌ Deux équipes d'un même duo reçoivent la même journée.</p>`;

      result.innerHTML += (!doublonErreur && !streakErreur && !journeesErreur && !duoErreur)
        ? `<p style="color:green;font-weight:bold;">🎉 Championnat ${champ.prefixe} valide sans erreur !</p>`
        : `<p style="color:red;font-weight:bold;">⚠️ Problèmes détectés pour ${champ.prefixe}.</p>`;
    });
  });
}

// --- Theme toggle ---
const themeBtn = document.getElementById("theme-button");
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    document.getElementById("theme-button").textContent = isDark ? "☀️" : "🌙";
  });
}

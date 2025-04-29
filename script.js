// --- Configuration des championnats ---
const championnats = [
  { id: 'carousel-10', nbEquipes: 10, prefixe: 'Equipe' },
  { id: 'carousel-12', nbEquipes: 12, prefixe: 'Equipe' },
  { id: 'carousel-14', nbEquipes: 14, prefixe: 'Team' },
  { id: 'carousel-16', nbEquipes: 16, prefixe: 'E' }
];

// --- Génération du Round Robin brut ---
function generateRoundRobinBrut(nbEquipes, prefixe) {
  const jours = [];
  const equipes = Array.from({ length: nbEquipes }, (_, i) => i + 1);

  if (nbEquipes % 2 !== 0) {
    equipes.push(null); // Bye si impair
  }

  const totalEquipes = equipes.length;
  const totalJournees = totalEquipes - 1;
  const half = totalEquipes / 2;

  let currentTeams = equipes.slice();

  for (let journee = 0; journee < totalJournees; journee++) {
    const matchs = [];
    for (let i = 0; i < half; i++) {
      const team1 = currentTeams[i];
      const team2 = currentTeams[totalEquipes - 1 - i];

      if (team1 !== null && team2 !== null) {
        if (journee % 2 === 0) {
          matchs.push({ home: `${prefixe} ${team1}`, away: `${prefixe} ${team2}` });
        } else {
          matchs.push({ home: `${prefixe} ${team2}`, away: `${prefixe} ${team1}` });
        }
      }
    }
    jours.push({ type: 'Aller', journee: journee + 1, matchs: matchs });

    const fixed = currentTeams.shift();
    const moved = currentTeams.pop();
    currentTeams.unshift(fixed);
    currentTeams.splice(1, 0, moved);
  }

  return jours;
}

// --- Correction aller-retour pour éviter 3 domiciles/extérieurs ---
function equilibrerAllerRetour(journeesAller) {
  const historique = {};

  function getLastNStatus(equipe, n) {
    const hist = historique[equipe] || [];
    return hist.slice(-n);
  }

  const allerCorrige = journeesAller.map(journee => ({
    type: 'Aller',
    journee: journee.journee,
    matchs: journee.matchs.map(match => ({ ...match }))
  }));

  const retourCorrige = journeesAller.map(journee => ({
    type: 'Retour',
    journee: journee.journee,
    matchs: journee.matchs.map(match => ({
      home: match.away,
      away: match.home
    }))
  }));

  const toutesJournees = [...allerCorrige, ...retourCorrige];

  toutesJournees.forEach(journee => {
    journee.matchs.forEach(match => {
      const { home, away } = match;

      const homeStreak = getLastNStatus(home, 2).every(status => status === 'D');
      const awayStreak = getLastNStatus(away, 2).every(status => status === 'E');

      if (homeStreak || awayStreak) {
        [match.home, match.away] = [match.away, match.home];
      }

      historique[match.home] = [...(historique[match.home] || []), 'D'];
      historique[match.away] = [...(historique[match.away] || []), 'E'];
    });
  });

  return toutesJournees;
}

// --- Générer le calendrier complet corrigé ---
function generateCalendrier(nbEquipes, prefixe) {
  const journeesAller = generateRoundRobinBrut(nbEquipes, prefixe);
  return equilibrerAllerRetour(journeesAller);
}

// --- Afficher une journée ---
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
    row.innerHTML = `<td>${match.home}</td><td>${match.away}</td>`;
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  content.appendChild(table);
}

// --- Initialisation ---
championnats.forEach(champ => {
  const container = document.getElementById(champ.id);
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

// === TEST AUTOMATIQUE ===
document.getElementById('test-button').addEventListener('click', () => {
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

    const historique = {};
    for (let i = 1; i <= champ.nb; i++) {
      historique[`${champ.prefixe} ${i}`] = [];
    }

    calendrier.forEach(journee => {
      const matchsDuJour = new Set();
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

    for (const equipe in historique) {
      const parcours = historique[equipe].join('');
      if (/DDD/.test(parcours) || /EEE/.test(parcours)) {
        streakErreur = true;
      }
    }

    if (calendrier.length !== 2 * (champ.nb - 1)) {
      journeesErreur = true;
    }

    // Afficher résultats
    result.innerHTML += `<h3>Résultats pour ${champ.prefixe} (${champ.nb} équipes)</h3>`;
    if (!doublonErreur) {
      result.innerHTML += `<p style="color:green;">✅ Aucune équipe ne joue deux fois par journée.</p>`;
    } else {
      result.innerHTML += `<p style="color:red;">❌ Des équipes jouent plusieurs fois dans la même journée.</p>`;
    }

    if (!streakErreur) {
      result.innerHTML += `<p style="color:green;">✅ Pas de 3 matchs consécutifs domicile ou extérieur.</p>`;
    } else {
      result.innerHTML += `<p style="color:red;">❌ 3 matchs consécutifs domicile ou extérieur détectés.</p>`;
    }

    if (!journeesErreur) {
      result.innerHTML += `<p style="color:green;">✅ Nombre de journées correct.</p>`;
    } else {
      result.innerHTML += `<p style="color:red;">❌ Nombre de journées incorrect.</p>`;
    }

    if (!doublonErreur && !streakErreur && !journeesErreur) {
      result.innerHTML += `<p style="color:green;font-weight:bold;">🎉 Championnat ${champ.prefixe} valide sans erreur !</p>`;
    } else {
      result.innerHTML += `<p style="color:red;font-weight:bold;">⚠️ Problèmes détectés pour ${champ.prefixe}.</p>`;
    }
  });
});

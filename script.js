// --- Configuration des championnats ---
const championnats = [
  { id: 'carousel-12', nbEquipes: 12, prefixe: 'Equipe' },
  { id: 'carousel-14', nbEquipes: 14, prefixe: 'Team' },
  { id: 'carousel-16', nbEquipes: 16, prefixe: 'E' }
];

// --- Génération du Round Robin brut (sans correction) ---
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

// --- Correction complète de l'aller + retour combinés ---
function equilibrerAllerRetour(journeesAller) {
  const historique = {};

  function getLastNStatus(equipe, n) {
    const hist = historique[equipe] || [];
    return hist.slice(-n);
  }

  // Créer l'aller
  const allerCorrige = journeesAller.map(journee => ({
    type: 'Aller',
    journee: journee.journee,
    matchs: journee.matchs.map(match => ({ ...match }))
  }));

  // Créer le retour inversé
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
        // Inverser le match si nécessaire
        match.home = away;
        match.away = home;
      }

      // Mise à jour historique
      historique[match.home] = [...(historique[match.home] || []), 'D'];
      historique[match.away] = [...(historique[match.away] || []), 'E'];
    });
  });

  return toutesJournees;
}

// --- Générer le calendrier final corrigé ---
function generateCalendrier(nbEquipes, prefixe) {
  const journeesAller = generateRoundRobinBrut(nbEquipes, prefixe);
  const calendrier = equilibrerAllerRetour(journeesAller);
  return calendrier;
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

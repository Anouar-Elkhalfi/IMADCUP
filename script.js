// --- Configuration des championnats ---
const championnats = [
  { id: 'carousel-12', nbEquipes: 12, prefixe: 'Equipe' },
  { id: 'carousel-14', nbEquipes: 14, prefixe: 'Team' },
  { id: 'carousel-16', nbEquipes: 16, prefixe: 'E' }
];

// --- Générer le Round Robin brut ---
function generateRoundRobinBrut(nbEquipes, prefixe) {
  const jours = [];
  const equipes = Array.from({ length: nbEquipes }, (_, i) => i + 1);

  if (nbEquipes % 2 !== 0) {
    equipes.push(null); // Ajouter "bye" si impair
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

    // Rotation des équipes sauf la première
    const fixed = currentTeams.shift();
    const moved = currentTeams.pop();
    currentTeams.unshift(fixed);
    currentTeams.splice(1, 0, moved);
  }

  return jours;
}

// --- Correction pour alterner domicile/extérieur ---
function equilibrerMatchs(journees) {
  const homeStreaks = {};
  const awayStreaks = {};

  journees.forEach(journee => {
    journee.matchs.forEach(match => {
      const { home, away } = match;

      homeStreaks[home] = homeStreaks[home] || 0;
      awayStreaks[away] = awayStreaks[away] || 0;

      // Si une équipe a déjà 2 matchs à domicile, inverser
      if (homeStreaks[home] >= 2) {
        match.home = away;
        match.away = home;
        homeStreaks[away] = (homeStreaks[away] || 0) + 1;
        awayStreaks[home] = (awayStreaks[home] || 0) + 1;
      }
      // Si une équipe a déjà 2 matchs à l'extérieur, inverser
      else if (awayStreaks[away] >= 2) {
        match.home = away;
        match.away = home;
        homeStreaks[away] = (homeStreaks[away] || 0) + 1;
        awayStreaks[home] = (awayStreaks[home] || 0) + 1;
      }
      else {
        homeStreaks[home]++;
        awayStreaks[away]++;
      }
    });
  });

  return journees;
}

// --- Générer ALLER et RETOUR équilibrés ---
function generateRoundRobin(nbEquipes, prefixe) {
  const aller = equilibrerMatchs(generateRoundRobinBrut(nbEquipes, prefixe));

  const retour = aller.map(j => ({
    type: 'Retour',
    journee: j.journee,
    matchs: j.matchs.map(m => ({
      home: m.away,
      away: m.home
    }))
  }));

  return [...aller, ...retour];
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

  const calendrier = generateRoundRobin(champ.nbEquipes, champ.prefixe);

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

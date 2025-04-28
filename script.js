// --- Configuration des championnats ---
const championnats = [
  { id: 'carousel-12', nbEquipes: 12, prefixe: 'Equipe' },
  { id: 'carousel-14', nbEquipes: 14, prefixe: 'Team' },
  { id: 'carousel-16', nbEquipes: 16, prefixe: 'E' }
];

// --- Générer les journées (Aller et Retour) ---
function generateJournees(nbEquipes, prefixe) {
  const jours = [];

  // Aller
  for (let journee = 1; journee < nbEquipes; journee++) {
    const matchs = [];
    for (let i = 1; i <= nbEquipes / 2; i++) {
      let home = (i + journee - 1) % nbEquipes || nbEquipes;
      let away = (nbEquipes - i + journee) % nbEquipes || nbEquipes;
      matchs.push({ home: `${prefixe} ${home}`, away: `${prefixe} ${away}` });
    }
    jours.push({ type: 'Aller', journee, matchs });
  }

  // Retour
  for (let journee = 1; journee < nbEquipes; journee++) {
    const matchs = [];
    for (let i = 1; i <= nbEquipes / 2; i++) {
      let away = (i + journee - 1) % nbEquipes || nbEquipes;
      let home = (nbEquipes - i + journee) % nbEquipes || nbEquipes;
      matchs.push({ home: `${prefixe} ${home}`, away: `${prefixe} ${away}` });
    }
    jours.push({ type: 'Retour', journee, matchs });
  }

  return jours;
}

// --- Générer les phases finales (quarts, demis, finale) ---
function generatePhasesFinales(prefixe) {
  return [
    {
      phase: 'Quarts de Finale',
      matchs: [
        { home: `${prefixe} 1`, away: `${prefixe} 8` },
        { home: `${prefixe} 2`, away: `${prefixe} 7` },
        { home: `${prefixe} 3`, away: `${prefixe} 6` },
        { home: `${prefixe} 4`, away: `${prefixe} 5` }
      ]
    },
    {
      phase: 'Demi-finales',
      matchs: [
        { home: 'Vainqueur Q1', away: 'Vainqueur Q4' },
        { home: 'Vainqueur Q2', away: 'Vainqueur Q3' }
      ]
    },
    {
      phase: 'Finale',
      matchs: [
        { home: 'Vainqueur D1', away: 'Vainqueur D2' }
      ]
    }
  ];
}

// --- Fonction pour afficher la journée pour un championnat donné ---
function afficherJournee(container, calendrier, index) {
  const title = container.querySelector('.journee-title');
  const content = container.querySelector('.carousel-content');
  const data = calendrier[index];

  content.innerHTML = '';

  if (data.type) {
    title.textContent = `Journée ${data.journee} (${data.type})`;
  } else if (data.phase) {
    title.textContent = data.phase;
  }

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

// --- Initialisation pour chaque championnat ---
championnats.forEach(champ => {
  const container = document.getElementById(champ.id);
  const prevBtn = container.querySelector('.prev-button');
  const nextBtn = container.querySelector('.next-button');

  const calendrier = [
    ...generateJournees(champ.nbEquipes, champ.prefixe),
    ...generatePhasesFinales(champ.prefixe)
  ];

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

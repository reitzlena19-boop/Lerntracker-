// ==========================================
// 1. AUTH, LOGIN & PROFIL LOGIK
// ==========================================
const authOverlay = document.getElementById('authOverlay');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const favSongInput = document.getElementById('favSongInput');
const favSubjectInput = document.getElementById('favSubjectInput');
const favTeacherInput = document.getElementById('favTeacherInput');
const profileDetailsArea = document.getElementById('profileDetailsArea');
const customAvatarInput = document.getElementById('customAvatarInput');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const sidebarAvatar = document.getElementById('sidebarAvatar');
const sidebarUsername = document.getElementById('sidebarUsername');
const logoutBtn = document.getElementById('logoutBtn');
const editProfileBtn = document.getElementById('editProfileBtn');

let userAccount = JSON.parse(localStorage.getItem('myUserAccount')) || null;
let allUsersDatabase = JSON.parse(localStorage.getItem('myCommunityUsers')) || [];
let isEditMode = false;
let customAvatarBase64 = null;

// Bild-Upload verarbeiten
customAvatarInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      customAvatarBase64 = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Auth-Formular initialisieren
function initAuth() {
  if (!userAccount) {
    // Neuer Nutzer
    authTitle.textContent = "Willkommen! ✨";
    authSubtitle.textContent = "Richte dein Profil ein, um fortzufahren.";
    profileDetailsArea.classList.remove('hidden');
    usernameInput.value = '';
    usernameInput.readOnly = false;
    passwordInput.value = '';
    authSubmitBtn.textContent = "Profil erstellen";
    cancelEditBtn.classList.add('hidden');
  } else if (isEditMode) {
    // Bearbeiten
    authTitle.textContent = "Profil bearbeiten ⚙️";
    authSubtitle.textContent = "Passe deine Daten und Favoriten an.";
    profileDetailsArea.classList.remove('hidden');
    usernameInput.value = userAccount.username;
    usernameInput.readOnly = false;
    passwordInput.value = userAccount.password;
    favSongInput.value = userAccount.favSong || '';
    favSubjectInput.value = userAccount.favSubject || '';
    favTeacherInput.value = userAccount.favTeacher || '';
    authSubmitBtn.textContent = "Änderungen speichern";
    cancelEditBtn.classList.remove('hidden');
  } else {
    // Normales Einloggen
    authTitle.textContent = `Willkommen zurück, ${userAccount.username}! ✨`;
    authSubtitle.textContent = "Gib dein Passwort ein, um dich einzuloggen.";
    profileDetailsArea.classList.add('hidden');
    usernameInput.value = userAccount.username;
    usernameInput.readOnly = true;
    passwordInput.value = '';
    authSubmitBtn.textContent = "Einloggen";
    cancelEditBtn.classList.add('hidden');
  }
}

// Formular-Submit verarbeiten (Login & Profil-Erstellung)
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const enteredUser = usernameInput.value.trim();
  const enteredPass = passwordInput.value;

  // Fall 1: Erstmalige Profil-Erstellung ODER Profil bearbeiten
  if (!userAccount || isEditMode) {
    let chosenAvatar = document.querySelector('input[name="avatarOpt"]:checked').value;
    if (customAvatarBase64) {
      chosenAvatar = customAvatarBase64;
    } else if (isEditMode && userAccount) {
      chosenAvatar = userAccount.avatar;
    }

    userAccount = {
      username: enteredUser,
      password: enteredPass,
      favSong: favSongInput.value.trim(),
      favSubject: favSubjectInput.value.trim(),
      favTeacher: favTeacherInput.value.trim(),
      avatar: chosenAvatar,
      learnedSeconds: isEditMode && userAccount ? (userAccount.learnedSeconds || 0) : (totalLearnedSeconds || 0)
    };

    localStorage.setItem('myUserAccount', JSON.stringify(userAccount));
    saveToCommunityDatabase(userAccount);
    isEditMode = false;
    unlockApp();
  } 
  // Fall 2: Normaler Login
  else {
    if (enteredPass === userAccount.password) {
      unlockApp();
    } else {
      alert("Falsches Passwort! Bitte versuche es erneut.");
    }
  }
});

function saveToCommunityDatabase(account) {
  const existingIdx = allUsersDatabase.findIndex(u => u.username.toLowerCase() === account.username.toLowerCase());
  const publicData = {
    username: account.username,
    favSong: account.favSong,
    favSubject: account.favSubject,
    favTeacher: account.favTeacher,
    learnedSeconds: totalLearnedSeconds || account.learnedSeconds || 0
  };

  if (existingIdx !== -1) {
    allUsersDatabase[existingIdx] = publicData;
  } else {
    allUsersDatabase.push(publicData);
  }

  localStorage.setItem('myCommunityUsers', JSON.stringify(allUsersDatabase));
}

function unlockApp() {
  authOverlay.classList.add('hidden');
  sidebarUsername.textContent = userAccount.username;
  
  if (userAccount.avatar.startsWith('data:image')) {
    sidebarAvatar.innerHTML = `<img src="${userAccount.avatar}" alt="Profil">`;
  } else {
    sidebarAvatar.textContent = userAccount.avatar;
  }

  updateDashboard();
  renderCommunityRankings();
}

editProfileBtn.addEventListener('click', () => {
  isEditMode = true;
  authOverlay.classList.remove('hidden');
  initAuth();
});

cancelEditBtn.addEventListener('click', () => {
  isEditMode = false;
  authOverlay.classList.add('hidden');
});

logoutBtn.addEventListener('click', () => {
  isEditMode = false;
  authOverlay.classList.remove('hidden');
  initAuth();
});

initAuth();


// ==========================================
// 2. SIDEBAR NAVIGATION
// ==========================================
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    views.forEach(v => v.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
    
    if (btn.dataset.target === 'dashboardView') {
      updateDashboard();
    } else if (btn.dataset.target === 'communityView') {
      renderCommunityRankings();
    }
  });
});


// ==========================================
// 3. GLOBALE DATEN SPEICHERUNG
// ==========================================
let exams = JSON.parse(localStorage.getItem('myExams')) || [];
let subjectsData = JSON.parse(localStorage.getItem('myGradesData')) || [];
let streakData = JSON.parse(localStorage.getItem('myStreakData')) || { count: 0, lastDate: null };
let totalLearnedSeconds = parseInt(localStorage.getItem('myTotalSeconds')) || 0;

function saveExams() { 
  localStorage.setItem('myExams', JSON.stringify(exams)); 
  updateDashboard();
}

function saveGradesData() { 
  localStorage.setItem('myGradesData', JSON.stringify(subjectsData)); 
  updateDashboard();
}


// ==========================================
// 4. COMMUNITY & RANKINGS LOGIK
// ==========================================
function renderCommunityRankings() {
  const leaderboardList = document.getElementById('leaderboardList');
  const topSongsList = document.getElementById('topSongsList');
  const topSubjectsList = document.getElementById('topSubjectsList');
  const topTeachersList = document.getElementById('topTeachersList');

  if (userAccount) {
    saveToCommunityDatabase(userAccount);
  }

  // ÖFFENTLICHES LERNZEIT-RANKING
  const sortedUsers = [...allUsersDatabase].sort((a, b) => (b.learnedSeconds || 0) - (a.learnedSeconds || 0));
  leaderboardList.innerHTML = '';

  if (sortedUsers.length === 0) {
    leaderboardList.innerHTML = '<li>Noch keine Einträge vorhanden!</li>';
  } else {
    sortedUsers.forEach(user => {
      const li = document.createElement('li');
      const formattedTime = formatiereZeit(user.learnedSeconds || 0);
      li.classList.add('ranking-item-flex');
      li.innerHTML = `<span><strong>${user.username}</strong></span> <span class="time-tag">⏱️ ${formattedTime}</span>`;
      leaderboardList.appendChild(li);
    });
  }

  // ANONYME FAVORITEN-RANKINGS
  buildAnonymousRanking(topSongsList, 'favSong');
  buildAnonymousRanking(topSubjectsList, 'favSubject');
  buildAnonymousRanking(topTeachersList, 'favTeacher');
}

function buildAnonymousRanking(element, key) {
  element.innerHTML = '';
  const counts = {};

  allUsersDatabase.forEach(user => {
    const val = user[key];
    if (val && val.trim() !== '') {
      const normalized = val.trim();
      counts[normalized] = (counts[normalized] || 0) + 1;
    }
  });

  const sortedKeys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  if (sortedKeys.length === 0) {
    element.innerHTML = '<li>Keine Angaben vorhanden</li>';
    return;
  }

  sortedKeys.forEach(item => {
    const li = document.createElement('li');
    li.classList.add('ranking-item-flex');
    li.innerHTML = `<span>${item}</span> <span class="ranking-count">${counts[item]}x gewählt</span>`;
    element.appendChild(li);
  });
}


// ==========================================
// 5. STREAK LOGIK
// ==========================================
function checkAndUpdateStreak() {
  const today = new Date().toISOString().split('T')[0];
  if (!streakData.lastDate) return;

  const last = new Date(streakData.lastDate);
  const current = new Date(today);
  const diffDays = Math.round((current - last) / (1000 * 60 * 60 * 24));

  if (diffDays > 1) {
    streakData.count = 0;
    localStorage.setItem('myStreakData', JSON.stringify(streakData));
  }
}

function recordStudySession() {
  const today = new Date().toISOString().split('T')[0];
  if (streakData.lastDate === today) return;

  const last = streakData.lastDate ? new Date(streakData.lastDate) : null;
  const current = new Date(today);

  if (last) {
    const diffDays = Math.round((current - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streakData.count++;
    } else if (diffDays > 1) {
      streakData.count = 1;
    }
  } else {
    streakData.count = 1;
  }

  streakData.lastDate = today;
  localStorage.setItem('myStreakData', JSON.stringify(streakData));
}


// ==========================================
// 6. DASHBOARD LOGIK
// ==========================================
function updateDashboard() {
  checkAndUpdateStreak();
  document.getElementById('streakCount').textContent = streakData.count;

  const petAvatar = document.getElementById('petAvatar');
  const petName = document.getElementById('petName');
  const petStatus = document.getElementById('petStatus');
  const petXpBar = document.getElementById('petXpBar');
  const petXpText = document.getElementById('petXpText');

  const totalMinutes = Math.floor(totalLearnedSeconds / 60);

  if (totalMinutes < 60) {
    petAvatar.textContent = "🥚";
    petName.textContent = "Drachenei";
    petStatus.textContent = "Es wackelt leicht... Lerne weiter!";
    const pct = Math.min(100, Math.floor((totalMinutes / 60) * 100));
    petXpBar.style.width = pct + "%";
    petXpText.textContent = `${totalMinutes} / 60 Min. bis zum Schlüpfen`;
  } else if (totalMinutes < 300) {
    petAvatar.textContent = "🐲";
    petName.textContent = "Baby-Drache";
    petStatus.textContent = "Frisch geschlüpft und voller Energie!";
    const currentStageMins = totalMinutes - 60;
    const pct = Math.min(100, Math.floor((currentStageMins / 240) * 100));
    petXpBar.style.width = pct + "%";
    petXpText.textContent = `${totalMinutes} / 300 Min. bis zur Mutation`;
  } else {
    petAvatar.textContent = "🐉";
    petName.textContent = "Mächtiger Drache";
    petStatus.textContent = "Dein treuer Begleiter beschützt deine Noten!";
    petXpBar.style.width = "100%";
    petXpText.textContent = `${totalMinutes} Min. gelernt – Legendär!`;
  }

  const nextExamContainer = document.getElementById('nextExamContainer');
  const today = new Date().toISOString().split('T')[0];
  const upcomingExams = exams
    .filter(e => e.date >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (upcomingExams.length > 0) {
    const next = upcomingExams[0];
    const learnedTimeFormatted = formatiereZeit(next.learnedSeconds || 0);

    const [year, month, day] = next.date.split('-');
    const germanDate = `${day}.${month}.${year}`;

    nextExamContainer.innerHTML = `
      <div class="next-exam-card" style="border-left: 6px solid ${next.color}">
        <h4 style="margin: 0; font-size: 24px;">${next.subject} – ${next.title}</h4>
        <p style="margin: 5px 0;">📅 Am <strong>${germanDate}</strong></p>
        <span class="time-tag">⏱️ Bisher gelernt: ${learnedTimeFormatted}</span>
      </div>
    `;
  } else {
    nextExamContainer.innerHTML = `<p>Aktuell stehen keine Prüfungen an! 🎉</p>`;
  }

  const overallGpaDisplay = document.getElementById('overallGpaDisplay');
  let totalGradesCount = 0;
  let totalGradesSum = 0;

  subjectsData.forEach(sub => {
    sub.grades.forEach(g => {
      totalGradesSum += g.value;
      totalGradesCount++;
    });
  });

  if (totalGradesCount > 0) {
    overallGpaDisplay.textContent = (totalGradesSum / totalGradesCount).toFixed(2);
  } else {
    overallGpaDisplay.textContent = '-.-';
  }
}


// ==========================================
// 7. TIMER LOGIK
// ==========================================
let sekunden = 0;
let timerIntervall = null;
const timerDisplay = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const saveTimeBtn = document.getElementById('saveTimeBtn');
const assignExamArea = document.getElementById('assignExamArea');
const timerExamSelect = document.getElementById('timerExamSelect');
const confirmSaveBtn = document.getElementById('confirmSaveBtn');

function formatiereZeit(gesamteSekunden) {
  const std = String(Math.floor(gesamteSekunden / 3600)).padStart(2, '0');
  const min = String(Math.floor((gesamteSekunden % 3600) / 60)).padStart(2, '0');
  const sek = String(gesamteSekunden % 60).padStart(2, '0');
  return `${std}:${min}:${sek}`;
}

startBtn.addEventListener('click', () => {
  if (timerIntervall === null) {
    timerIntervall = setInterval(() => {
      sekunden++;
      timerDisplay.textContent = formatiereZeit(sekunden);
    }, 1000);
    startBtn.textContent = 'Pause';
    startBtn.style.backgroundColor = '#86E3CE';
  } else {
    clearInterval(timerIntervall);
    timerIntervall = null;
    startBtn.textContent = 'Weiter lernen';
    startBtn.style.backgroundColor = '#8A2BE2';
  }
});

saveTimeBtn.addEventListener('click', () => {
  if (sekunden === 0) {
    alert("Du hast noch keine Lernzeit auf dem Timer!");
    return;
  }
  
  clearInterval(timerIntervall);
  timerIntervall = null;
  startBtn.textContent = 'Session starten';
  startBtn.style.backgroundColor = '#8A2BE2';

  timerExamSelect.innerHTML = '<option value="" disabled selected>Prüfung auswählen...</option>';
  exams.forEach((ex, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    const [year, month, day] = ex.date.split('-');
    opt.textContent = `${ex.subject} - ${ex.title} (${day}.${month}.${year})`;
    timerExamSelect.appendChild(opt);
  });

  assignExamArea.classList.remove('hidden');
});

confirmSaveBtn.addEventListener('click', () => {
  const selectedIdx = timerExamSelect.value;
  if (selectedIdx === "") {
    alert("Bitte wähle eine Prüfung aus!");
    return;
  }

  if (!exams[selectedIdx].learnedSeconds) {
    exams[selectedIdx].learnedSeconds = 0;
  }
  exams[selectedIdx].learnedSeconds += sekunden;

  totalLearnedSeconds += sekunden;
  localStorage.setItem('myTotalSeconds', totalLearnedSeconds);
  recordStudySession();

  if (userAccount) {
    userAccount.learnedSeconds = totalLearnedSeconds;
    localStorage.setItem('myUserAccount', JSON.stringify(userAccount));
    saveToCommunityDatabase(userAccount);
  }

  saveExams();
  renderExamList();
  renderCalendar();

  sekunden = 0;
  timerDisplay.textContent = '00:00:00';
  assignExamArea.classList.add('hidden');
  alert("Lernzeit verbucht! Dein Drache wächst und deine Streak brennt! 🔥🐉");
});


// ==========================================
// 8. MONATSKALENDER LOGIK
// ==========================================
const examForm = document.getElementById('examForm');
const examSubject = document.getElementById('examSubject');
const examDate = document.getElementById('examDate');
const examTitle = document.getElementById('examTitle');
const examColor = document.getElementById('examColor');
const examList = document.getElementById('examList');
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthYear = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');

let currentDate = new Date();

function renderCalendar() {
  calendarGrid.innerHTML = '';
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  currentMonthYear.textContent = `${monthNames[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let x = 0; x < adjustedFirstDay; x++) {
    calendarGrid.appendChild(document.createElement('div'));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.classList.add('day-cell');
    
    const dayNumber = document.createElement('span');
    dayNumber.classList.add('day-number');
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);

    const monthFormatted = String(month + 1).padStart(2, '0');
    const dayFormatted = String(day).padStart(2, '0');
    const dateString = `${year}-${monthFormatted}-${dayFormatted}`;

    const dayExams = exams.filter(e => e.date === dateString);
    dayExams.forEach(exam => {
      const badge = document.createElement('div');
      badge.classList.add('exam-dot');
      badge.style.backgroundColor = exam.color;
      badge.textContent = exam.subject;
      badge.title = `${exam.subject}: ${exam.title}`;
      dayCell.appendChild(badge);
    });

    calendarGrid.appendChild(dayCell);
  }
}

function renderExamList() {
  examList.innerHTML = '';
  exams.forEach((exam, index) => {
    const totalSecs = exam.learnedSeconds || 0;
    const learnedFormatted = formatiereZeit(totalSecs);
    const [year, month, day] = exam.date.split('-');

    const li = document.createElement('li');
    li.style.borderLeft = `5px solid ${exam.color}`;
    li.innerHTML = `
      <div>
        <strong>${exam.subject} – ${exam.title}</strong><br>
        <small>Datum: ${day}.${month}.${year}</small>
      </div>
      <div>
        <span class="time-tag">⏱️ ${learnedFormatted}</span>
        <button class="delete-btn">Löschen</button>
      </div>
    `;

    li.querySelector('.delete-btn').addEventListener('click', () => {
      exams.splice(index, 1);
      saveExams();
      renderExamList();
      renderCalendar();
    });

    examList.appendChild(li);
  });
}

prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

examForm.addEventListener('submit', (e) => {
  e.preventDefault();
  exams.push({ 
    subject: examSubject.value, 
    date: examDate.value, 
    title: examTitle.value, 
    color: examColor.value,
    learnedSeconds: 0 
  });
  saveExams();
  renderExamList();
  renderCalendar();
  examForm.reset();
});

renderCalendar();
renderExamList();


// ==========================================
// 9. NOTENVERWALTUNG & NOTEN-PROGNOSE LOGIK
// ==========================================
const subjectForm = document.getElementById('subjectForm');
const newSubjectName = document.getElementById('newSubjectName');
const gradeForm = document.getElementById('gradeForm');
const gradeSubjectSelect = document.getElementById('gradeSubjectSelect');
const gradeTypeSelect = document.getElementById('gradeTypeSelect');
const gradeValueInput = document.getElementById('gradeValueInput');
const subjectsContainer = document.getElementById('subjectsContainer');
const predictSubjectSelect = document.getElementById('predictSubjectSelect');
const targetGradeInput = document.getElementById('targetGradeInput');
const calcPredictionBtn = document.getElementById('calcPredictionBtn');
const predictionResult = document.getElementById('predictionResult');

function updateSubjectDropdowns() {
  gradeSubjectSelect.innerHTML = '<option value="" disabled selected>Fach auswählen...</option>';
  predictSubjectSelect.innerHTML = '<option value="" disabled selected>Fach auswählen...</option>';

  subjectsData.forEach(sub => {
    const opt1 = document.createElement('option');
    opt1.value = sub.id;
    opt1.textContent = sub.name;
    gradeSubjectSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = sub.id;
    opt2.textContent = sub.name;
    predictSubjectSelect.appendChild(opt2);
  });
}

function renderGrades() {
  subjectsContainer.innerHTML = '';
  updateSubjectDropdowns();

  subjectsData.forEach(sub => {
    const card = document.createElement('div');
    card.classList.add('subject-card');

    let averageText = 'Keine Noten';
    if (sub.grades.length > 0) {
      const sum = sub.grades.reduce((acc, g) => acc + g.value, 0);
      const avg = (sum / sub.grades.length).toFixed(2);
      averageText = `Schnitt: ${avg}`;
    }

    card.innerHTML = `
      <div class="subject-header">
        <h4>${sub.name}</h4>
        <span class="average-badge">${averageText}</span>
      </div>
      <ul class="grade-list" id="gradesOf-${sub.id}"></ul>
    `;

    const gradeListEl = card.querySelector(`#gradesOf-${sub.id}`);
    sub.grades.forEach((g, gIndex) => {
      const tag = document.createElement('li');
      tag.classList.add('grade-tag');
      tag.innerHTML = `
        <strong>${g.value}</strong> (${g.type})
        <button class="delete-grade-btn">✕</button>
      `;

      tag.querySelector('.delete-grade-btn').addEventListener('click', () => {
        sub.grades.splice(gIndex, 1);
        saveGradesData();
        renderGrades();
      });

      gradeListEl.appendChild(tag);
    });

    subjectsContainer.appendChild(card);
  });
}

calcPredictionBtn.addEventListener('click', () => {
  const subId = predictSubjectSelect.value;
  const targetAvg = parseFloat(targetGradeInput.value);

  if (!subId || isNaN(targetAvg)) {
    alert("Bitte wähle ein Fach und gib eine Zielnote ein!");
    return;
  }

  const subject = subjectsData.find(s => s.id === subId);
  if (!subject) return;

  const existingGrades = subject.grades;
  const count = existingGrades.length;

  if (count === 0) {
    predictionResult.textContent = `Du brauchst als erste Note eine ${targetAvg.toFixed(1)}!`;
    return;
  }

  const currentSum = existingGrades.reduce((acc, g) => acc + g.value, 0);
  const neededGrade = (targetAvg * (count + 1)) - currentSum;

  if (neededGrade < 1.0) {
    predictionResult.textContent = `Selbst mit einer 1.0 erreichst du diesen Schnitt nicht mehr ganz! 🎉 (Rechnerisch: ${neededGrade.toFixed(1)})`;
  } else if (neededGrade > 6.0) {
    predictionResult.textContent = `Keine Sorge! Selbst mit einer 6.0 bleibt dein Schnitt besser als ${targetAvg.toFixed(1)}!`;
  } else {
    predictionResult.textContent = `Du brauchst in der nächsten Prüfung eine ${neededGrade.toFixed(1)} oder besser! 🎯`;
  }
});

subjectForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = newSubjectName.value.trim();
  if (!name) return;

  subjectsData.push({
    id: Date.now().toString(),
    name: name,
    grades: []
  });

  saveGradesData();
  renderGrades();
  subjectForm.reset();
});

gradeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const subjectId = gradeSubjectSelect.value;
  const type = gradeTypeSelect.value;
  const value = parseFloat(gradeValueInput.value);

  const targetSubject = subjectsData.find(s => s.id === subjectId);
  if (targetSubject) {
    targetSubject.grades.push({ type, value });
    saveGradesData();
    renderGrades();
    gradeForm.reset();
  }
});

renderGrades();
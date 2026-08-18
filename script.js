// Globaler Anwendungsstatus
let currentUser = null;
let userProfile = {
  username: "Anonym",
  totalMinutes: 0,
  subjects: [],
  todos: []
};

// Timer Variablen
let timerInterval = null;
let timerSeconds = 25 * 60;
let isTimerRunning = false;

// DOM Elemente
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authUsername = document.getElementById('authUsername');
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const btnLogout = document.getElementById('btnLogout');
const authError = document.getElementById('authError');
const displayUsername = document.getElementById('displayUsername');

// Navigation
const navAll = document.getElementById('navAll');
const navTodos = document.getElementById('navTodos');
const cardTimer = document.getElementById('cardTimer');
const cardGrades = document.getElementById('cardGrades');
const cardPet = document.getElementById('cardPet');
const cardRanking = document.getElementById('cardRanking');
const cardTodos = document.getElementById('cardTodos');

// Timer Elemente
const timerDisplay = document.getElementById('timerDisplay');
const btnStartTimer = document.getElementById('btnStartTimer');
const btnPauseTimer = document.getElementById('btnPauseTimer');
const btnResetTimer = document.getElementById('btnResetTimer');

// Pet Elemente
const petAvatar = document.getElementById('petAvatar');
const petStage = document.getElementById('petStage');
const totalLearnTime = document.getElementById('totalLearnTime');
const petProgress = document.getElementById('petProgress');
const nextLevelMinutes = document.getElementById('nextLevelMinutes');

// Ranking & Noten Elemente
const rankingList = document.getElementById('rankingList');
const newSubjectName = document.getElementById('newSubjectName');
const newSubjectGrade = document.getElementById('newSubjectGrade');
const btnAddSubject = document.getElementById('btnAddSubject');
const subjectList = document.getElementById('subjectList');
const averageGrade = document.getElementById('averageGrade');

// To-Do Elemente
const newTodoInput = document.getElementById('newTodoInput');
const btnAddTodo = document.getElementById('btnAddTodo');
const todoList = document.getElementById('todoList');

// -------------------------------------------------------------
// INITIALISIERUNG
// -------------------------------------------------------------

window.addEventListener('load', () => {
  const checkFirebase = setInterval(() => {
    if (window.auth && window.db) {
      clearInterval(checkFirebase);
      initApp();
    }
  }, 100);
});

function initApp() {
  const { onAuthStateChanged } = window.fbAuth;

  onAuthStateChanged(window.auth, (user) => {
    if (user) {
      currentUser = user;
      authSection.classList.add('hidden');
      dashboardSection.classList.remove('hidden');
      loadUserData(user.uid);
      listenToLeaderboard();
    } else {
      currentUser = null;
      authSection.classList.remove('hidden');
      dashboardSection.classList.add('hidden');
    }
  });

  // Auth Events
  btnLogin.addEventListener('click', handleLogin);
  btnRegister.addEventListener('click', handleRegister);
  btnLogout.addEventListener('click', () => window.fbAuth.signOut(window.auth));

  // Timer Events
  btnStartTimer.addEventListener('click', startTimer);
  btnPauseTimer.addEventListener('click', pauseTimer);
  btnResetTimer.addEventListener('click', resetTimer);

  // Noten Events
  btnAddSubject.addEventListener('click', addSubject);

  // To-Do Events
  btnAddTodo.addEventListener('click', addTodo);

  // Navigation Events
  navAll.addEventListener('click', () => filterView('all'));
  navTodos.addEventListener('click', () => filterView('todos'));
}

// -------------------------------------------------------------
// NAVIGATION FILTER
// -------------------------------------------------------------

function filterView(view) {
  if (view === 'todos') {
    navAll.classList.remove('active');
    navTodos.classList.add('active');
    cardTimer.classList.add('hidden');
    cardGrades.classList.add('hidden');
    cardPet.classList.add('hidden');
    cardRanking.classList.add('hidden');
    cardTodos.classList.remove('hidden');
  } else {
    navTodos.classList.remove('active');
    navAll.classList.add('active');
    cardTimer.classList.remove('hidden');
    cardGrades.classList.remove('hidden');
    cardPet.classList.remove('hidden');
    cardRanking.classList.remove('hidden');
    cardTodos.classList.remove('hidden');
  }
}

// -------------------------------------------------------------
// AUTH HANDLER
// -------------------------------------------------------------

async function handleLogin() {
  authError.textContent = '';
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    authError.textContent = 'Bitte E-Mail und Passwort eingeben.';
    return;
  }

  try {
    await window.fbAuth.signInWithEmailAndPassword(window.auth, email, password);
  } catch (err) {
    authError.textContent = 'Fehler beim Anmelden: ' + err.message;
  }
}

async function handleRegister() {
  authError.textContent = '';
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const username = authUsername.value.trim() || 'Lerner';

  if (!email || !password) {
    authError.textContent = 'Bitte E-Mail und Passwort eingeben.';
    return;
  }

  try {
    const cred = await window.fbAuth.createUserWithEmailAndPassword(window.auth, email, password);
    await window.fbDb.setDoc(window.fbDb.doc(window.db, 'users', cred.user.uid), {
      username: username,
      totalMinutes: 0,
      subjects: [],
      todos: []
    });
  } catch (err) {
    authError.textContent = 'Fehler beim Registrieren: ' + err.message;
  }
}

// -------------------------------------------------------------
// CLOUD SYNC & REALTIME UPDATES
// -------------------------------------------------------------

async function loadUserData(uid) {
  const userDocRef = window.fbDb.doc(window.db, 'users', uid);
  const docSnap = await window.fbDb.getDoc(userDocRef);

  if (docSnap.exists()) {
    userProfile = { todos: [], subjects: [], ...docSnap.data() };
  } else {
    userProfile = { username: "Lerner", totalMinutes: 0, subjects: [], todos: [] };
  }

  displayUsername.innerHTML = `<i class="fa-regular fa-circle-user"></i> Hallo, ${escapeHtml(userProfile.username)}!`;
  updatePetUI();
  renderSubjects();
  renderTodos();
}

async function saveUserData() {
  if (!currentUser) return;
  const userDocRef = window.fbDb.doc(window.db, 'users', currentUser.uid);
  await window.fbDb.setDoc(userDocRef, userProfile, { merge: true });
}

function listenToLeaderboard() {
  const { collection, query, orderBy, limit, onSnapshot } = window.fbDb;
  const q = query(collection(window.db, 'users'), orderBy('totalMinutes', 'desc'), limit(10));

  onSnapshot(q, (snapshot) => {
    rankingList.innerHTML = '';
    let rank = 1;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const li = document.createElement('li');
      li.className = 'ranking-item';
      li.innerHTML = `<span>#${rank} ${escapeHtml(data.username || 'Anonym')}</span> <span><strong>${data.totalMinutes || 0}</strong> Min</span>`;
      rankingList.appendChild(li);
      rank++;
    });
  });
}

// -------------------------------------------------------------
// TO-DO LOGIK
// -------------------------------------------------------------

function addTodo() {
  const text = newTodoInput.value.trim();
  if (!text) return;

  if (!userProfile.todos) userProfile.todos = [];
  userProfile.todos.push({ text, completed: false });

  newTodoInput.value = '';
  renderTodos();
  saveUserData();
}

function toggleTodo(index) {
  if (userProfile.todos && userProfile.todos[index]) {
    userProfile.todos[index].completed = !userProfile.todos[index].completed;
    renderTodos();
    saveUserData();
  }
}

function removeTodo(index) {
  if (userProfile.todos) {
    userProfile.todos.splice(index, 1);
    renderTodos();
    saveUserData();
  }
}

function renderTodos() {
  todoList.innerHTML = '';
  const todos = userProfile.todos || [];

  if (todos.length === 0) {
    todoList.innerHTML = '<p style="font-size:0.85em; color:#888; text-align:center; padding:10px;">Keine offenen Aufgaben!</p>';
    return;
  }

  todos.forEach((todo, idx) => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <span>${escapeHtml(todo.text)}</span>
      <div class="todo-actions">
        <button class="btn btn-secondary btn-icon" style="background:#55efc4; color:#fff;" onclick="toggleTodo(${idx})"><i class="fa-solid fa-check"></i></button>
        <button class="btn btn-secondary btn-icon" style="background:#ff7675; color:#fff;" onclick="removeTodo(${idx})"><i class="fa-solid fa-xmark"></i></button>
      </div>
    `;
    todoList.appendChild(li);
  });
}

window.toggleTodo = toggleTodo;
window.removeTodo = removeTodo;

// -------------------------------------------------------------
// DRACHEN PET GAMIFICATION LOGIK
// -------------------------------------------------------------

function updatePetUI() {
  const mins = userProfile.totalMinutes || 0;
  totalLearnTime.textContent = mins;

  let avatar = '🥚';
  let stage = 'Drachen-Ei';
  let nextGoal = 30;
  let progressPct = 0;

  if (mins < 30) {
    avatar = '🥚';
    stage = 'Drachen-Ei';
    nextGoal = 30;
    progressPct = (mins / 30) * 100;
  } else if (mins < 120) {
    avatar = '🐣';
    stage = 'Baby-Drache';
    nextGoal = 120;
    progressPct = ((mins - 30) / (120 - 30)) * 100;
  } else if (mins < 300) {
    avatar = '🐉';
    stage = 'Jungdrache';
    nextGoal = 300;
    progressPct = ((mins - 120) / (300 - 120)) * 100;
  } else {
    avatar = '🔥🐉🔥';
    stage = 'Legendärer Drache';
    nextGoal = mins;
    progressPct = 100;
  }

  petAvatar.textContent = avatar;
  petStage.textContent = stage;
  petProgress.style.width = `${Math.min(progressPct, 100)}%`;
  nextLevelMinutes.textContent = Math.max(0, nextGoal - mins);
}

// -------------------------------------------------------------
// TIMER LOGIK
// -------------------------------------------------------------

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;

  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
    } else {
      pauseTimer();
      alert('Klasse gemacht! Deine Lerneinheit ist abgeschlossen (+25 Min).');
      userProfile.totalMinutes = (userProfile.totalMinutes || 0) + 25;
      updatePetUI();
      saveUserData();
      resetTimer();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
}

function resetTimer() {
  pauseTimer();
  timerSeconds = 25 * 60;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  timerDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// -------------------------------------------------------------
// NOTENRECHNER LOGIK
// -------------------------------------------------------------

function addSubject() {
  const name = newSubjectName.value.trim();
  const grade = parseFloat(newSubjectGrade.value);

  if (!name || isNaN(grade) || grade < 1 || grade > 6) {
    alert('Bitte gib einen gültigen Fachnamen und eine Note zwischen 1.0 und 6.0 ein.');
    return;
  }

  if (!userProfile.subjects) userProfile.subjects = [];
  userProfile.subjects.push({ name, grade });

  newSubjectName.value = '';
  newSubjectGrade.value = '';

  renderSubjects();
  saveUserData();
}

function removeSubject(index) {
  userProfile.subjects.splice(index, 1);
  renderSubjects();
  saveUserData();
}

function renderSubjects() {
  subjectList.innerHTML = '';
  const subjects = userProfile.subjects || [];

  if (subjects.length === 0) {
    subjectList.innerHTML = '<p style="font-size:0.85em; color:#888; text-align:center; padding:10px;">Noch keine Fächer eingetragen.</p>';
    averageGrade.textContent = '-';
    return;
  }

  let totalGrade = 0;

  subjects.forEach((subj, idx) => {
    totalGrade += subj.grade;
    const item = document.createElement('div');
    item.className = 'subject-item';
    item.innerHTML = `
      <span><strong>${escapeHtml(subj.name)}</strong>: Note ${subj.grade.toFixed(1)}</span>
      <button class="btn btn-secondary btn-icon" style="background:#ff7675; color:#fff;" onclick="removeSubject(${idx})"><i class="fa-solid fa-trash"></i></button>
    `;
    subjectList.appendChild(item);
  });

  const avg = totalGrade / subjects.length;
  averageGrade.textContent = avg.toFixed(2);
}

window.removeSubject = removeSubject;

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
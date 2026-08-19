import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Deine Firebase Konfiguration
const firebaseConfig = {
    apiKey: "AIzaSyBnOdU2kbDwEd-pjQzCqtSEpveikZhg2zA",
    authDomain: "lerntracker-5d78c.firebaseapp.com",
    projectId: "lerntracker-5d78c",
    storageBucket: "lerntracker-5d78c.firebasestorage.app",
    messagingSenderId: "1046179377844",
    appId: "1:1046179377844:web:df25b07667a94f0134dde1"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Globale Anwendungs-Daten
let currentUser = localStorage.getItem('currentUser') || "";
let totalStudyMinutes = 0;
let examsList = [];
let calendarEntries = [];
let todosList = [];
let communityUsers = [];

let userSong = "-";
let userTeacher = "-";
let userSubject = "-";

// Globale Timer-Variablen
let timerInterval = null;
let totalSeconds = 25 * 60;
let remainingSeconds = 25 * 60;
let isRunning = false;

let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();

// Daten in Firebase speichern
async function saveData() {
    if (!currentUser) return;

    const userData = {
        totalStudyMinutes: totalStudyMinutes,
        examsList: examsList,
        calendarEntries: calendarEntries,
        todosList: todosList,
        song: userSong,
        teacher: userTeacher,
        subject: userSubject
    };

    try {
        await setDoc(doc(db, "users", currentUser), userData);
        
        communityUsers = [{
            username: currentUser,
            studyMinutes: totalStudyMinutes,
            song: userSong,
            teacher: userTeacher,
            subject: userSubject
        }];
    } catch (e) {
        console.error("Fehler beim Speichern in Firebase: ", e);
    }
}

// Daten aus Firebase laden
async function loadUserData(username) {
    try {
        const docRef = doc(db, "users", username);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            totalStudyMinutes = data.totalStudyMinutes || 0;
            examsList = data.examsList || [];
            calendarEntries = data.calendarEntries || [];
            todosList = data.todosList || [];
            userSong = data.song || "-";
            userTeacher = data.teacher || "-";
            userSubject = data.subject || "-";
        } else {
            totalStudyMinutes = 0;
            examsList = [];
            calendarEntries = [];
            todosList = [];
        }

        communityUsers = [{
            username: username,
            studyMinutes: totalStudyMinutes,
            song: userSong,
            teacher: userTeacher,
            subject: userSubject
        }];
    } catch (e) {
        console.error("Fehler beim Laden aus Firebase: ", e);
    }
}

// Umschalten zwischen Dashboard-Sektionen
window.switchSection = function(sectionId) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }

    const titleEl = document.getElementById('section-title');
    const contentView = document.getElementById('content-view');

    if (sectionId === 'overview') {
        titleEl.textContent = 'Dashboard';
        
        let dashboardTodosHtml = '<p>Keine offenen Aufgaben. Super! 🎉</p>';
        if (todosList.length > 0) {
            dashboardTodosHtml = `
                <ul style="list-style: none; padding: 0; max-height: 150px; overflow-y: auto;">
                    ${todosList.map((todo, index) => `
                        <li style="display: flex; align-items: center; padding: 5px 0; border-bottom: 1px solid #f0e6ff;">
                            <label style="display: flex; align-items: center; cursor: pointer; width: 100%; text-decoration: ${todo.done ? 'line-through' : 'none'}; color: ${todo.done ? '#888' : '#4a4a4a'};">
                                <input type="checkbox" ${todo.done ? 'checked' : ''} onclick="toggleTodoFromDashboard(${index})" style="margin-right: 8px;"> 
                                ${todo.text}
                            </label>
                        </li>
                    `).join('')}
                </ul>
            `;
        }

        contentView.innerHTML = `
            <div class="dashboard-grid">
                <div class="card timer-quick-card">
                    <h3>⏳ Lern-Timer Schnellzugriff</h3>
                    <div class="mini-timer-display" id="mini-timer-display">25:00</div>
                    <div class="mini-timer-controls">
                        <button onclick="startMiniTimer()" class="btn-sm">Start</button>
                        <button onclick="pauseMiniTimer()" class="btn-sm">Pause</button>
                        <button onclick="resetMiniTimer()" class="btn-sm">Reset</button>
                    </div>
                </div>

                <div class="card">
                    <h3>📊 Lernfortschritt</h3>
                    <p>Gesamte Lernzeit: <strong><span id="total-study-time-display">${totalStudyMinutes}</span> Minuten</strong></p>
                    <p>Tschakka! Mach weiter so! 🐢✨</p>
                </div>

                <div class="card" style="grid-column: span 2;">
                    <h3>📝 Anstehende Aufgaben</h3>
                    ${dashboardTodosHtml}
                </div>
            </div>
        `;
        updateMiniTimerDisplay();
    } else if (sectionId === 'timer') {
        titleEl.textContent = 'Lern-Timer';
        let examOptionsHtml = examsList.map(e => `<option value="${e.subject} (${e.type})">${e.subject} - ${e.type}</option>`).join('');
        if (examsList.length === 0) examOptionsHtml = `<option value="Allgemein">Keine Prüfungen eingetragen</option>`;

        contentView.innerHTML = `
            <div class="card" style="max-width: 600px; margin: 0 auto;">
                <h3>Vollständiger Lern-Timer</h3>
                <div class="timer-config">
                    <label>Lernzeit einstellen:</label>
                    <select id="timer-duration-select" onchange="changeTimerDuration()">
                        <option value="15">15 Minuten</option>
                        <option value="25" selected>25 Minuten (Pomodoro)</option>
                        <option value="45">45 Minuten</option>
                        <option value="60">60 Minuten</option>
                    </select>
                    <label>Für welche Prüfung lernst du?</label>
                    <select id="timer-exam-select">${examOptionsHtml}</select>
                </div>
                <div class="timer-big-display" id="big-timer-display">25:00</div>
                <div class="mini-timer-controls">
                    <button onclick="startBigTimer()" class="btn-primary">Start</button>
                    <button onclick="pauseBigTimer()" class="btn-sm">Pause</button>
                    <button onclick="resetBigTimer()" class="btn-sm">Reset</button>
                </div>
            </div>
        `;
        updateBigTimerDisplay();
    } else if (sectionId === 'turtle') {
        titleEl.textContent = 'Deine Lern-Schildkröte';
        let turtleStageImg = "🥚";
        let turtleStageTitle = "Schildkröten-Ei";
        let turtleDescription = "Dein Ei ist noch ganz warm. Lerne mindestens 60 Minuten, damit die Schildkröte schlüpft!";
        let progressPercent = Math.min(100, Math.floor((totalStudyMinutes / 180) * 100));

        if (totalStudyMinutes >= 180) {
            turtleStageImg = "🐢✨";
            turtleStageTitle = "Grosse Lern-Schildkröte";
            turtleDescription = "Wahnsinn! Deine Schildkröte ist voll ausgewachsen und begleitet dich stolz durch all deine Prüfungen!";
        } else if (totalStudyMinutes >= 60) {
            turtleStageImg = "🐢";
            turtleStageTitle = "Schlüpfte Baby-Schildkröte";
            turtleDescription = "Herzlichen Glückwunsch! Das Ei ist aufgegangen. Deine Baby-Schildkröte wächst mit jeder gelernten Minute weiter!";
        }

        contentView.innerHTML = `
            <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center;">
                <h3>Evolutions-Status</h3>
                <div style="font-size: 5rem; margin: 20px 0;">${turtleStageImg}</div>
                <h2 style="color: #6b5b95;">${turtleStageTitle}</h2>
                <p style="margin-bottom: 20px;">${turtleDescription}</p>
                <div style="background: #f7f3ff; border: 1px solid #e6d7ff; padding: 15px; border-radius: 8px; text-align: left;">
                    <p style="margin: 0 0 5px 0;"><strong>Aktuelle Lernzeit:</strong> ${totalStudyMinutes} Minuten</p>
                    <p style="margin: 0 0 10px 0;"><strong>Nächster Meilenstein:</strong> ${totalStudyMinutes < 60 ? '60 Min. (Schlüpfen)' : (totalStudyMinutes < 180 ? '180 Min. (Volle Größe)' : 'Maximum erreicht! 🎉')}</p>
                    <div style="background: #e6d7ff; border-radius: 5px; height: 12px; width: 100%; overflow: hidden;">
                        <div style="background: #6b5b95; height: 100%; width: ${progressPercent}%; transition: width 0.4s ease;"></div>
                    </div>
                </div>
            </div>
        `;
    } else if (sectionId === 'grades') {
        titleEl.textContent = 'Noten & Prüfungen';
        contentView.innerHTML = `
            <div class="dashboard-grid">
                <div class="card">
                    <h3>Deine Prüfungen</h3>
                    ${examsList.length === 0 ? '<p>Noch keine Prüfungen eingetragen.</p>' : `
                        <ul style="list-style: none; padding: 0;">
                            ${examsList.map((e, index) => `
                                <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e6d7ff;">
                                    <span><strong>${e.subject}</strong> (${e.type})</span>
                                    <button onclick="deleteExam(${index})" class="btn-sm" style="background-color: #ffcccc;">Löschen</button>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>
                <div class="card">
                    <h3>Prüfung hinzufügen</h3>
                    <form onsubmit="handleAddExam(event)">
                        <label>Fach:</label>
                        <input type="text" id="exam-subject-input" placeholder="z.B. Mathematik" required>
                        <label>Art der Prüfung:</label>
                        <input type="text" id="exam-type-input" placeholder="z.B. Klausur / Test" required>
                        <button type="submit" class="btn-primary" style="margin-top: 10px;">Hinzufügen</button>
                    </form>
                </div>
            </div>
        `;
    } else if (sectionId === 'calendar') {
        const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
        titleEl.textContent = `Kalender (${monthNames[currentCalendarMonth]} ${currentCalendarYear})`;
        const firstDayIndex = (new Date(currentCalendarYear, currentCalendarMonth, 1).getDay() + 6) % 7;
        const totalDays = new Date(currentCalendarYear, currentCalendarMonth + 1, 0).getDate();
        const now = new Date();
        const isCurrentMonth = (now.getFullYear() === currentCalendarYear && now.getMonth() === currentCalendarMonth);
        const todayDate = now.getDate();

        let daysHtml = `<div class="calendar-day-header">Mo</div><div class="calendar-day-header">Di</div><div class="calendar-day-header">Mi</div><div class="calendar-day-header">Do</div><div class="calendar-day-header">Fr</div><div class="calendar-day-header">Sa</div><div class="calendar-day-header">So</div>`;
        for (let i = 0; i < firstDayIndex; i++) daysHtml += `<div class="calendar-day" style="opacity: 0.3;"></div>`;
        for (let i = 1; i <= totalDays; i++) {
            let entriesForDay = calendarEntries.filter(entry => entry.year == currentCalendarYear && entry.month == currentCalendarMonth && entry.day == i);
            let entryHtml = entriesForDay.map(en => `<br><small style="color:#6b5b95;">• ${en.title}</small>`).join('');
            let isToday = (isCurrentMonth && i === todayDate) ? 'today' : '';
            daysHtml += `<div class="calendar-day ${isToday}"><strong>${i}</strong>${entryHtml}</div>`;
        }

        contentView.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <button onclick="changeMonth(-1)" class="btn-sm">◀ Vorheriger Monat</button>
                <h3 style="margin: 0; color: #6b5b95;">${monthNames[currentCalendarMonth]} ${currentCalendarYear}</h3>
                <button onclick="changeMonth(1)" class="btn-sm">Nächster Monat ▶</button>
            </div>
            <div class="calendar-layout">
                <div class="card"><div class="calendar-grid">${daysHtml}</div></div>
                <div class="card">
                    <h3>Eintrag hinzufügen</h3>
                    <form onsubmit="handleAddCalendarEntry(event)">
                        <label>Typ:</label>
                        <select id="cal-entry-type" onchange="toggleEntryFields()">
                            <option value="exam">Prüfung</option>
                            <option value="appointment">Termin</option>
                        </select>
                        <label>Tag im Monat (1-${totalDays}):</label>
                        <input type="number" id="cal-day" min="1" max="${totalDays}" required>
                        <div id="exam-fields">
                            <label>Fach:</label><input type="text" id="cal-exam-subject" placeholder="z.B. Biologie">
                            <label>Art der Prüfung:</label><input type="text" id="cal-exam-type" placeholder="z.B. Test / Klausur">
                        </div>
                        <div id="appointment-fields" class="hidden">
                            <label>Terminbeschreibung:</label><input type="text" id="cal-appointment-desc" placeholder="z.B. Lerngruppe treffen">
                        </div>
                        <button type="submit" class="btn-primary" style="margin-top: 10px;">Hinzufügen</button>
                    </form>
                </div>
            </div>
        `;
    } else if (sectionId === 'todos') {
        titleEl.textContent = 'To-Do Liste';
        contentView.innerHTML = `
            <div class="card" style="max-width: 600px; margin: 0 auto;">
                <h3>Deine Aufgaben</h3>
                <form onsubmit="handleAddTodo(event)" style="margin-bottom: 20px;">
                    <input type="text" id="new-todo-text" placeholder="Neue Aufgabe eingeben..." required>
                    <button type="submit" class="btn-primary" style="margin-top: 5px;">Hinzufügen</button>
                </form>
                <ul style="list-style: none; padding: 0;">
                    ${todosList.map((todo, index) => `
                        <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e6d7ff;">
                            <span style="text-decoration: ${todo.done ? 'line-through' : 'none'}; color: ${todo.done ? '#888' : '#4a4a4a'};">
                                <input type="checkbox" ${todo.done ? 'checked' : ''} onclick="toggleTodo(${index})"> ${todo.text}
                            </span>
                            <button onclick="deleteTodo(${index})" class="btn-sm" style="background-color: #ffcccc;">Löschen</button>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    } else if (sectionId === 'community') {
        titleEl.textContent = 'Community & Rankings';
        let sortedRanking = [...communityUsers].sort((a, b) => b.studyMinutes - a.studyMinutes);

        contentView.innerHTML = `
            <div class="dashboard-grid">
                <div class="card">
                    <h3>🏆 Lernzeit-Bestenliste</h3>
                    <ol style="padding-left: 20px;">
                        ${sortedRanking.map(u => `<li><strong>${u.username}</strong>: ${u.studyMinutes} Minuten</li>`).join('')}
                    </ol>
                </div>
                <div class="card">
                    <h3>✨ Anonyme Community-Favoriten</h3>
                    <p>Beliebtestes Lieblingslied: <strong>${userSong}</strong></p>
                    <p>Beliebtester Lieblingslehrer: <strong>${userTeacher}</strong></p>
                    <p>Beliebtestes Lieblingsfach: <strong>${userSubject}</strong></p>
                </div>
            </div>
        `;
    } else if (sectionId === 'profile') {
        titleEl.textContent = 'Profil';
        contentView.innerHTML = `
            <div class="card" style="max-width: 500px; margin: 0 auto;">
                <h3>Benutzerprofil</h3>
                <p>Eingeloggt als: <strong>${currentUser}</strong></p>
                <p>Lieblingslied: <strong>${userSong}</strong></p>
                <p>Lieblingslehrer: <strong>${userTeacher}</strong></p>
                <p>Lieblingsfach: <strong>${userSubject}</strong></p>
                <p>Gesamtlernzeit: <strong>${totalStudyMinutes} Minuten</strong></p>
            </div>
        `;
    }
};

window.changeMonth = function(direction) {
    currentCalendarMonth += direction;
    if (currentCalendarMonth > 11) { currentCalendarMonth = 0; currentCalendarYear++; }
    else if (currentCalendarMonth < 0) { currentCalendarMonth = 11; currentCalendarYear--; }
    switchSection('calendar');
};

window.handleAddExam = function(event) {
    event.preventDefault();
    const subject = document.getElementById('exam-subject-input').value;
    const type = document.getElementById('exam-type-input').value;
    examsList.push({ subject, type });
    saveData();
    switchSection('grades');
};

window.deleteExam = function(index) {
    examsList.splice(index, 1);
    saveData();
    switchSection('grades');
};

function updateMiniTimerDisplay() {
    const displayEl = document.getElementById('mini-timer-display');
    if (!displayEl) return;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    displayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

window.startMiniTimer = function() {
    if (isRunning) return;
    isRunning = true;
    timerInterval = setInterval(() => {
        if (remainingSeconds > 0) {
            remainingSeconds--;
            updateMiniTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            addStudyTime(Math.floor(totalSeconds / 60));
            alert("Lerneinheit beendet! Gut gemacht! 🎉 Deine Schildkröte freut sich!");
        }
    }, 1000);
};

window.pauseMiniTimer = function() { clearInterval(timerInterval); isRunning = false; };
window.resetMiniTimer = function() { clearInterval(timerInterval); isRunning = false; remainingSeconds = totalSeconds; updateMiniTimerDisplay(); };

window.changeTimerDuration = function() {
    const select = document.getElementById('timer-duration-select');
    const mins = parseInt(select.value);
    totalSeconds = mins * 60;
    remainingSeconds = totalSeconds;
    updateBigTimerDisplay();
};

function updateBigTimerDisplay() {
    const displayEl = document.getElementById('big-timer-display');
    if (!displayEl) return;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    displayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

window.startBigTimer = function() {
    if (isRunning) return;
    isRunning = true;
    timerInterval = setInterval(() => {
        if (remainingSeconds > 0) {
            remainingSeconds--;
            updateBigTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            let learnedMins = Math.floor(totalSeconds / 60);
            addStudyTime(learnedMins);
            alert(`Lerneinheit erfolgreich beendet! +${learnedMins} Minuten Gesamtlernzeit. 🐢✨`);
        }
    }, 1000);
};

window.pauseBigTimer = function() { clearInterval(timerInterval); isRunning = false; };
window.resetBigTimer = function() { clearInterval(timerInterval); isRunning = false; remainingSeconds = totalSeconds; updateBigTimerDisplay(); };

function addStudyTime(mins) {
    let oldMinutes = totalStudyMinutes;
    totalStudyMinutes += mins;
    saveData();
    
    if (oldMinutes < 60 && totalStudyMinutes >= 60) {
        alert("🥚 Krack! Deine Schildkröte ist aus dem Ei geschlüpft! Schau im Schildkröten-Menü nach!");
    }

    const timeDisplay = document.getElementById('total-study-time-display');
    if (timeDisplay) timeDisplay.textContent = totalStudyMinutes;
}

window.handleAddTodo = function(event) {
    event.preventDefault();
    const text = document.getElementById('new-todo-text').value;
    todosList.push({ text, done: false });
    saveData();
    switchSection('todos');
};

window.toggleTodo = function(index) { todosList[index].done = !todosList[index].done; saveData(); };
window.toggleTodoFromDashboard = function(index) { todosList[index].done = !todosList[index].done; saveData(); switchSection('overview'); };
window.deleteTodo = function(index) { todosList.splice(index, 1); saveData(); switchSection('todos'); };

window.toggleEntryFields = function() {
    const type = document.getElementById('cal-entry-type').value;
    const examFields = document.getElementById('exam-fields');
    const appointmentFields = document.getElementById('appointment-fields');
    if (type === 'exam') { examFields.classList.remove('hidden'); appointmentFields.classList.add('hidden'); }
    else { examFields.classList.add('hidden'); appointmentFields.classList.remove('hidden'); }
};

window.handleAddCalendarEntry = function(event) {
    event.preventDefault();
    const type = document.getElementById('cal-entry-type').value;
    const day = document.getElementById('cal-day').value;
    
    if (type === 'exam') {
        const subject = document.getElementById('cal-exam-subject').value;
        const examType = document.getElementById('cal-exam-type').value;
        examsList.push({ subject, type: examType });
        calendarEntries.push({ year: currentCalendarYear, month: currentCalendarMonth, day, title: `${subject} (${examType})` });
    } else {
        const desc = document.getElementById('cal-appointment-desc').value;
        calendarEntries.push({ year: currentCalendarYear, month: currentCalendarMonth, day, title: desc });
    }

    saveData();
    alert('Erfolgreich hinzugefügt!');
    switchSection('calendar');
};

window.switchAuthTab = function(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (tab === 'login') {
        loginForm.classList.remove('hidden'); registerForm.classList.add('hidden');
        tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    } else {
        loginForm.classList.add('hidden'); registerForm.classList.remove('hidden');
        tabLogin.classList.remove('active'); tabRegister.classList.add('active');
    }
};

window.handleLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    currentUser = email.split('@')[0];
    currentUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);

    await loadUserData(currentUser);

    localStorage.setItem('currentUser', currentUser);
    document.getElementById('display-username').textContent = currentUser;
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.remove('hidden');
    switchSection('overview');
};

window.handleRegister = async function(event) {
    event.preventDefault();
    const username = document.getElementById('reg-username').value;
    userSong = document.getElementById('reg-song').value;
    userTeacher = document.getElementById('reg-teacher').value;
    userSubject = document.getElementById('reg-subject').value;
    
    currentUser = username;
    totalStudyMinutes = 0;
    examsList = [];
    calendarEntries = [];
    todosList = [];

    await saveData();

    alert('Registrierung erfolgreich! Du kannst dich jetzt einloggen.');
    switchAuthTab('login');
};

window.handleLogout = function() {
    currentUser = "";
    localStorage.removeItem('currentUser');
    document.getElementById('dashboard-container').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
};

window.addEventListener('DOMContentLoaded', async () => {
    if (localStorage.getItem('currentUser')) {
        currentUser = localStorage.getItem('currentUser');
        await loadUserData(currentUser);

        document.getElementById('display-username').textContent = currentUser;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');
        switchSection('overview');
    }
});
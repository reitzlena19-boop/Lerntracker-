let seconds = 0;
let timerInterval;

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let exams = JSON.parse(localStorage.getItem('exams')) || [
    { name: 'Mathe', type: 'Schulaufgabe', date: '2026-09-01', timeSpent: 0 },
    { name: 'Englisch', type: 'Vokabeltest', date: '2026-09-05', timeSpent: 0 },
    { name: 'Biologie', type: 'Ex', date: '2026-09-10', timeSpent: 0 }
];
let grades = JSON.parse(localStorage.getItem('grades')) || [];
let participation = JSON.parse(localStorage.getItem('participation')) || {};
let calendarEvents = JSON.parse(localStorage.getItem('calendarEvents')) || [];
let flashcardSets = JSON.parse(localStorage.getItem('flashcardSets')) || [];
let streakData = JSON.parse(localStorage.getItem('streakData')) || { count: 0, lastActiveDate: '' };

let currentCalendarDate = new Date();
let currentFlashcardSetIdx = 0;
let currentCardIdx = 0;
let showingAnswer = false;
let currentForecastSubject = '';

window.onload = function() {
    checkAndUpdateStreak();
    showPage('Startseite');
};

const bavariaHolidays = [
    { name: "Ende der Sommerferien", start: new Date('2026-08-03'), end: new Date('2026-09-14') },
    { name: "Herbstferien", start: new Date('2026-11-02'), end: new Date('2026-11-06') },
    { name: "Weihnachtsferien", start: new Date('2026-12-24'), end: new Date('2027-01-08') },
    { name: "Frühjahrsferien", start: new Date('2027-02-08'), end: new Date('2027-02-12') },
    { name: "Osterferien", start: new Date('2027-03-22'), end: new Date('2027-04-02') },
    { name: "Pfingstferien", start: new Date('2027-05-18'), end: new Date('2027-05-28') },
    { name: "Sommerferien", start: new Date('2027-08-02'), end: new Date('2027-09-13') }
];

function getHolidayCountdownInfo() {
    let today = new Date();
    today.setHours(0,0,0,0);

    for (let holiday of bavariaHolidays) {
        let startDate = new Date(holiday.start);
        let endDate = new Date(holiday.end);
        startDate.setHours(0,0,0,0);
        endDate.setHours(0,0,0,0);

        if (today >= startDate && today <= endDate) {
            return { inHoliday: true, name: holiday.name, days: Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) };
        } else if (today < startDate) {
            let diffDays = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
            return { inHoliday: false, name: holiday.name, days: diffDays };
        }
    }
    return { inHoliday: false, name: "die nächsten Ferien", days: 0 };
}

function checkAndUpdateStreak() {
    let todayStr = new Date().toISOString().split('T')[0];
    let info = getHolidayCountdownInfo();
    
    if (info.inHoliday) {
        streakData.lastActiveDate = todayStr;
        localStorage.setItem('streakData', JSON.stringify(streakData));
        return;
    }
}

function showPage(pageName) {
    document.getElementById('page-title').innerText = pageName;
    let content = document.getElementById('content');
    
    if (pageName === 'Startseite') {
        let overallAvg = calculateOverallAverage();
        let chartHtml = generateChartHtml();
        let holidayInfo = getHolidayCountdownInfo();

        let countdownText = holidayInfo.inHoliday 
            ? `Du bist gerade in den ${holidayInfo.name}! Noch ${holidayInfo.days} Tage bis Schulbeginn.` 
            : `Noch ${holidayInfo.days} Tage bis zu den ${holidayInfo.name}!`;

        let allTermine = [];
        exams.forEach(ex => {
            allTermine.push({ date: ex.date, title: `Prüfung: ${ex.name} (${ex.type})`, color: '#ffb7c5' });
        });
        calendarEvents.forEach(ev => {
            allTermine.push({ date: ev.date, title: ev.title, color: ev.color });
        });
        allTermine.sort((a, b) => new Date(a.date) - new Date(b.date));

        let termineHtml = allTermine.length > 0 ? allTermine.map(t => `
            <li style="margin-bottom: 8px; padding: 6px 10px; border-radius: 8px; background-color: ${t.color}; display: flex; justify-content: space-between; align-items: center; font-size: 1.2rem;">
                <span><strong>${t.date}:</strong> ${t.title}</span>
            </li>
        `).join('') : '<p style="font-size: 1.2rem; color: #666; margin: 0;">Keine Termine eingetragen.</p>';

        // 100% bündiges CSS-Grid Layout ohne Lücken
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr 320px; gap: 15px; max-width: 1200px; align-items: stretch;">
                
                <div style="background: white; padding: 15px 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); font-size: 1.3rem; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>Gesamtdurchschnitt:</strong></span>
                    <span style="font-size: 1.5rem; color: #555;">${overallAvg}</span>
                </div>
                <div style="background: white; padding: 15px 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); font-size: 1.3rem; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>Lern-Streak:</strong></span>
                    <span style="font-size: 1.5rem; color: #ff4500;">🔥 ${streakData.count} Tage ${holidayInfo.inHoliday ? '(Eingefroren ❄️)' : ''}</span>
                </div>

                <div style="grid-row: span 4; background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                    <h3 style="margin-top: 0; margin-bottom: 15px;">Anstehende Termine</h3>
                    <ul style="list-style: none; padding: 0; margin: 0; overflow-y: auto; flex-grow: 1;">
                        ${termineHtml}
                    </ul>
                </div>

                <div style="grid-column: span 2; background: white; padding: 15px 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); font-size: 1.3rem; text-align: center;">
                    <strong>Ferien-Countdown:</strong> ${countdownText}
                </div>

                <div style="background: white; padding: 15px 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 10px 0;">Schnell-Timer</h3>
                    <div id="quick-timer-display" style="font-size: 2.2rem; margin-bottom: 10px;">00:00</div>
                    <button onclick="startTimer()" style="background-color: var(--tuerkis); border: none; padding: 6px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Start</button>
                </div>
                
                <div style="background: white; padding: 15px 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 10px 0;">Meine Aufgaben</h3>
                    <ul id="home-todo-list" style="list-style: none; padding: 0; margin: 0; font-size: 1.2rem; max-height: 110px; overflow-y: auto;"></ul>
                </div>

                <div style="grid-column: span 2; background: white; padding: 15px 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 10px 0;">Lernzeit-Übersicht</h3>
                    <div style="display: flex; align-items: flex-end; justify-content: center; height: 150px; border-bottom: 2px solid #ccc; padding-top: 10px; overflow-x: auto;">
                        ${chartHtml}
                    </div>
                </div>

            </div>
        `;
        renderHomeTodos();
    } else if (pageName === 'Lerntimer') {
        let options = exams.map((ex, idx) => `<option value="${idx}">${ex.name} (${ex.type})</option>`).join('');
        content.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 15px; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h3>Prüfung auswählen</h3>
                <select id="exam-select" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 15px;">
                    ${options}
                </select>
                <div id="timer-display" style="font-size: 3rem; margin-bottom: 15px; text-align: center;">00:00</div>
                <button onclick="startTimer()" style="background-color: var(--tuerkis); border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer; margin-right: 10px;">Start</button>
                <button onclick="saveTime()" style="background-color: var(--pastell-pink); border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Stopp & Speichern</button>
            </div>
        `;
    } else if (pageName === 'Aufgaben') {
        content.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 15px; max-width: 500px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h3>Neue Aufgabe hinzufügen</h3>
                <input type="text" id="task-input" placeholder="Aufgabe eingeben..." style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 65%; margin-right: 10px;">
                <button onclick="addTask()" style="background-color: var(--tuerkis); border: none; padding: 6px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Hinzufügen</button>
                
                <h3 style="margin-top: 20px;">Meine To-Do-Liste</h3>
                <ul id="full-task-list" style="list-style: none; padding: 0; font-size: 1.4rem;"></ul>
            </div>
        `;
        renderFullTasks();
    } else if (pageName === 'Melden') {
        let uniqueSubjects = [...new Set(exams.map(ex => ex.name))];
        let subjectsHtml = uniqueSubjects.map(subject => {
            let count = participation[subject] || 0;
            let checkboxes = '';
            for (let i = 0; i < 5; i++) {
                let checked = i < count ? 'checked' : '';
                checkboxes += `<input type="checkbox" ${checked} onclick="updateParticipation('${subject}', ${i + 1})" style="transform: scale(1.3); margin: 0 5px; cursor: pointer;">`;
            }
            let party = count === 5 ? ' 🎉 Super gemacht!' : '';
            return `<li style="margin: 15px 0; font-size: 1.4rem; display: flex; align-items: center; justify-content: space-between;">
                <span style="min-width: 120px;"><strong>${subject}</strong>:</span>
                <div>${checkboxes} <span style="font-size: 1.2rem;">${party}</span></div>
            </li>`;
        }).join('');

        content.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 15px; max-width: 600px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h3>Mündliche Mitarbeit (Pro Stunde bis zu 5 Mal)</h3>
                <ul style="list-style: none; padding: 0;">${subjectsHtml}</ul>
            </div>
        `;
    } else if (pageName === 'Lernzeit') {
        let listHtml = exams.map(ex => {
            let totalSeconds = ex.timeSpent || 0;
            let hours = Math.floor(totalSeconds / 3600);
            let minutes = Math.floor((totalSeconds % 3600) / 60);
            return `<li style="margin-bottom: 8px; font-size: 1.3rem;"><strong>${ex.name} (${ex.type}):</strong> ${hours} Std. ${minutes} Min.</li>`;
        }).join('');

        let chartHtml = generateChartHtml();

        content.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 15px; max-width: 600px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h3>Lernzeit pro Prüfung</h3>
                <ul style="list-style: none; padding: 0; margin-bottom: 30px;">${listHtml}</ul>
                
                <h3>Vergleichs-Diagramm</h3>
                <div style="display: flex; align-items: flex-end; justify-content: center; height: 200px; border-bottom: 2px solid #ccc; padding-top: 20px;">
                    ${chartHtml}
                </div>
            </div>
        `;
    } else if (pageName === 'Lernkarten') {
        renderFlashcardsPage();
    } else if (pageName === 'Noten & Prüfungen') {
        let uniqueSubjects = [...new Set(exams.map(ex => ex.name))];
        let subjectOptions = uniqueSubjects.map(s => `<option value="${s}">${s}</option>`).join('');

        let examsList = exams.map((ex, idx) => `
            <li style="margin: 10px 0; display: flex; justify-content: space-between; align-items: center; font-size: 1.3rem;">
                <span><strong>${ex.name}</strong> - ${ex.type} am ${ex.date}</span>
                <button onclick="deleteExam(${idx})" style="background-color: var(--pastell-pink); border: none; padding: 4px 10px; border-radius: 8px; font-family: 'Caveat', cursive; font-size: 1rem; cursor: pointer;">Löschen</button>
            </li>
        `).join('');

        let gradesSection = uniqueSubjects.map(subject => {
            let subGrades = grades.filter(g => g.subject === subject);
            let avg = subGrades.length > 0 ? (subGrades.reduce((sum, g) => sum + Number(g.grade), 0) / subGrades.length).toFixed(2) : 'Keine Noten';
            let gradesList = grades.map((g, globalIdx) => {
                if (g.subject === subject) {
                    return `<li>${g.type}: ${g.grade} <button onclick="deleteGrade(${globalIdx})" style="border:none; background:none; color:red; cursor:pointer;">x</button></li>`;
                }
                return '';
            }).join('');
            return `
                <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px;">
                    <strong>${subject}</strong> (Durchschnitt: ${avg})
                    <ul style="margin: 5px 0; padding-left: 20px; font-size: 1.1rem;">${gradesList}</ul>
                </div>
            `;
        }).join('');

        content.innerHTML = `
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="background: white; padding: 25px; border-radius: 15px; width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3>Prüfung erstellen</h3>
                    <input type="text" id="new-ex-name" placeholder="Fach eingeben..." style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                    <input type="text" id="new-ex-type" placeholder="Art (z.B. Schulaufgabe)" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                    <input type="date" id="new-ex-date" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                    <button onclick="addNewExam()" style="background-color: var(--tuerkis); border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Prüfung erstellen</button>
                    
                    <h3 style="margin-top: 20px;">Deine Prüfungen</h3>
                    <ul style="list-style: none; padding: 0; max-height: 200px; overflow-y: auto;">${examsList}</ul>
                </div>

                <div style="background: white; padding: 25px; border-radius: 15px; width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3>Note eintragen</h3>
                    <select id="grade-subject" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                        ${subjectOptions}
                    </select>
                    <select id="grade-type" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                        <option>Schriftlich</option>
                        <option>Mündlich</option>
                        <option>Ex</option>
                        <option>Referat</option>
                    </select>
                    <input type="number" step="0.1" id="grade-value" placeholder="Note (z.B. 2.0)" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                    <button onclick="addGrade()" style="background-color: var(--tuerkis); border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Note speichern</button>
                    
                    <h3 style="margin-top: 20px;">Noten & Schnitte</h3>
                    <div style="max-height: 200px; overflow-y: auto;">${gradesSection}</div>
                </div>
            </div>
        `;
    } else if (pageName === 'Kalender') {
        renderCalendarPage();
    } else if (pageName === 'Notenprognose') {
        renderForecastPage();
    } else {
        content.innerHTML = `<p>Hier öffnet sich bald die Ansicht für: ${pageName}</p>`;
    }
}

function renderForecastPage() {
    let uniqueSubjects = [...new Set(exams.map(ex => ex.name))];
    if (uniqueSubjects.length > 0 && !currentForecastSubject) {
        currentForecastSubject = uniqueSubjects[0];
    }
    let subjectOptions = uniqueSubjects.map(s => `<option value="${s}" ${s === currentForecastSubject ? 'selected' : ''}>${s}</option>`).join('');

    let subGrades = grades.filter(g => g.subject === currentForecastSubject);
    let avg = subGrades.length > 0 ? (subGrades.reduce((sum, g) => sum + Number(g.grade), 0) / subGrades.length).toFixed(2) : 'Keine Noten';
    let gradesListHtml = subGrades.length > 0 ? subGrades.map(g => `<li>${g.type}: ${g.grade}</li>`).join('') : '<li>Keine Noten vorhanden</li>';

    content.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 15px; max-width: 500px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3>Notenprognose berechnen</h3>
            <label style="font-size: 1.1rem;">Fach auswählen:</label>
            <select id="forecast-subject" onchange="changeForecastSubject(this.value)" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 15px;">
                ${subjectOptions}
            </select>

            <div style="margin-bottom: 15px; font-size: 1.3rem;">
                <strong>Aktueller Schnitt:</strong> ${avg}
                <ul style="margin: 5px 0; padding-left: 20px; font-size: 1.1rem;">${gradesListHtml}</ul>
            </div>

            <label style="font-size: 1.1rem;">Gewünschter Schnitt:</label>
            <input type="number" step="0.1" id="target-avg" placeholder="z.B. 2.0" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
            <button onclick="calculateForecast()" style="background-color: var(--tuerkis); border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer; width: 100%; margin-bottom: 15px;">Berechnen</button>

            <div id="forecast-result" style="font-size: 1.3rem; font-weight: bold; color: #333;"></div>
        </div>
    `;
}

function changeForecastSubject(subject) {
    currentForecastSubject = subject;
    renderForecastPage();
}

function calculateForecast() {
    let targetInput = document.getElementById('target-avg').value;
    let target = parseFloat(targetInput);
    let subGrades = grades.filter(g => g.subject === currentForecastSubject);
    let resultDiv = document.getElementById('forecast-result');

    if (isNaN(target)) {
        resultDiv.innerHTML = "Bitte gib einen gültigen Wunschschnitt ein!";
        return;
    }

    let n = subGrades.length;
    let currentSum = subGrades.reduce((sum, g) => sum + Number(g.grade), 0);
    let requiredGrade = target * (n + 1) - currentSum;

    if (requiredGrade < 1 || requiredGrade > 6) {
        resultDiv.innerHTML = `Mit ${n} Noten ist ein Schnitt von ${target} in ${currentForecastSubject} mathematisch kaum erreichbar (benötigte Note: ${requiredGrade.toFixed(2)}).`;
    } else {
        resultDiv.innerHTML = `Um in ${currentForecastSubject} auf einen Schnitt von ${target} zu kommen, brauchst du bei der nächsten Prüfung die Note: <span style="color: #ffb7c5; font-size: 1.6rem;">${requiredGrade.toFixed(2)}</span>`;
    }
}

function renderFlashcardsPage() {
    if (flashcardSets.length > 0 && currentFlashcardSetIdx >= flashcardSets.length) {
        currentFlashcardSetIdx = flashcardSets.length - 1;
    }
    let setOptions = flashcardSets.map((set, idx) => `<option value="${idx}" ${idx === currentFlashcardSetIdx ? 'selected' : ''}>${set.name}</option>`).join('');
    
    let activeSet = flashcardSets[currentFlashcardSetIdx];
    let quizHtml = '';

    if (activeSet && activeSet.cards && activeSet.cards.length > 0) {
        if (currentCardIdx >= activeSet.cards.length) currentCardIdx = 0;
        let card = activeSet.cards[currentCardIdx];
        let cardText = showingAnswer ? `Lösung: ${card.answer}` : `Frage: ${card.question}`;

        quizHtml = `
            <div style="border: 2px dashed var(--flieder); padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 15px; min-height: 100px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <span style="font-size: 1.5rem;">${cardText}</span>
                <span style="font-size: 1rem; color: #777; margin-top: 10px;">Status: ${card.status || 'Wiederholen'} | Karte ${currentCardIdx + 1} von ${activeSet.cards.length}</span>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button onclick="flipCard()" style="background-color: var(--flieder); color: white; border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Umdrehen</button>
                <button onclick="answerCard('Nicht gewusst')" style="background-color: var(--pastell-pink); border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Nicht gewusst</button>
                <button onclick="answerCard('Gewusst')" style="background-color: var(--tuerkis); border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Gewusst</button>
            </div>
        `;
    } else {
        quizHtml = `<p style="font-size: 1.2rem; color: #666; text-align: center;">Keine Karten in diesem Set vorhanden. Erstelle unten welche!</p>`;
    }

    let cardsList = activeSet && activeSet.cards ? activeSet.cards.map((c, i) => `
        <li style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 1.2rem;">
            <span><strong>F:</strong> ${c.question} | <strong>A:</strong> ${c.answer}</span>
            <button onclick="deleteFlashcard(${i})" style="background-color: var(--pastell-pink); border: none; padding: 3px 8px; border-radius: 6px; font-family: 'Caveat', cursive; cursor: pointer;">Löschen</button>
        </li>
    `).join('') : '';

    let deleteSetBtn = flashcardSets.length > 0 ? `<button onclick="deleteFlashcardSet()" style="background-color: var(--pastell-pink); border: none; padding: 5px 10px; border-radius: 8px; font-family: 'Caveat', cursive; font-size: 1.1rem; cursor: pointer; margin-top: 10px; width: 100%;">Dieses Set löschen</button>` : '';

    document.getElementById('content').innerHTML = `
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="background: white; padding: 25px; border-radius: 15px; width: 450px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h3>Lernkarten-Abfrage</h3>
                <label style="font-size: 1.1rem;">Set auswählen:</label>
                <select id="flashcard-set-select" onchange="changeFlashcardSet(this.value)" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 5px;">
                    ${setOptions}
                </select>
                ${deleteSetBtn}
                <div style="margin-top: 20px;">${quizHtml}</div>
            </div>

            <div style="background: white; padding: 25px; border-radius: 15px; width: 450px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h3>Neues Set erstellen</h3>
                <input type="text" id="new-set-name" placeholder="Set-Name (z.B. Vokabeln Unit 1)..." style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 65%; margin-right: 10px; margin-bottom: 15px;">
                <button onclick="createFlashcardSet()" style="background-color: var(--tuerkis); border: none; padding: 6px 12px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Set anlegen</button>

                <h3 style="margin-top: 10px;">Karte hinzufügen</h3>
                <input type="text" id="new-card-q" placeholder="Frage / Vokabel..." style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                <input type="text" id="new-card-a" placeholder="Antwort / Lösung..." style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                <button onclick="addFlashcard()" style="background-color: var(--tuerkis); border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer; width: 100%;">Karte hinzufügen</button>

                <h3 style="margin-top: 20px;">Karten in diesem Set</h3>
                <ul style="list-style: none; padding: 0; max-height: 150px; overflow-y: auto;">${cardsList}</ul>
            </div>
        </div>
    `;
}

function createFlashcardSet() {
    let input = document.getElementById('new-set-name');
    let name = input.value.trim();
    if (name) {
        flashcardSets.push({ name: name, cards: [] });
        localStorage.setItem('flashcardSets', JSON.stringify(flashcardSets));
        currentFlashcardSetIdx = flashcardSets.length - 1;
        currentCardIdx = 0;
        showingAnswer = false;
        renderFlashcardsPage();
    } else {
        alert("Bitte einen Namen für das Set eingeben!");
    }
}

function deleteFlashcardSet() {
    if (flashcardSets.length > 0) {
        flashcardSets.splice(currentFlashcardSetIdx, 1);
        localStorage.setItem('flashcardSets', JSON.stringify(flashcardSets));
        currentFlashcardSetIdx = 0;
        currentCardIdx = 0;
        showingAnswer = false;
        renderFlashcardsPage();
    }
}

function changeFlashcardSet(idx) {
    currentFlashcardSetIdx = Number(idx);
    currentCardIdx = 0;
    showingAnswer = false;
    renderFlashcardsPage();
}

function addFlashcard() {
    if (flashcardSets.length === 0) {
        alert("Bitte erstelle zuerst ein Set!");
        return;
    }
    let q = document.getElementById('new-card-q').value.trim();
    let a = document.getElementById('new-card-a').value.trim();
    if (q && a) {
        flashcardSets[currentFlashcardSetIdx].cards.push({ question: q, answer: a, status: 'Wiederholen' });
        localStorage.setItem('flashcardSets', JSON.stringify(flashcardSets));
        renderFlashcardsPage();
    } else {
        alert("Bitte Frage und Antwort eingeben!");
    }
}

function deleteFlashcard(cardIdx) {
    flashcardSets[currentFlashcardSetIdx].cards.splice(cardIdx, 1);
    localStorage.setItem('flashcardSets', JSON.stringify(flashcardSets));
    currentCardIdx = 0;
    showingAnswer = false;
    renderFlashcardsPage();
}

function flipCard() {
    showingAnswer = !showingAnswer;
    renderFlashcardsPage();
}

function answerCard(status) {
    let activeSet = flashcardSets[currentFlashcardSetIdx];
    if (activeSet && activeSet.cards[currentCardIdx]) {
        activeSet.cards[currentCardIdx].status = status;
        localStorage.setItem('flashcardSets', JSON.stringify(flashcardSets));
        showingAnswer = false;
        currentCardIdx = (currentCardIdx + 1) % activeSet.cards.length;
        renderFlashcardsPage();
    }
}

function renderCalendarPage() {
    let year = currentCalendarDate.getFullYear();
    let month = currentCalendarDate.getMonth();
    
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    
    let firstDayIndex = new Date(year, month, 1).getDay();
    firstDayIndex = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
    let totalDays = new Date(year, month + 1, 0).getDate();

    let daysHtml = '';
    for (let i = 0; i < firstDayIndex; i++) {
        daysHtml += `<div style="background: #f9f9f9; min-height: 80px; border: 1px solid #eee; border-radius: 8px;"></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        let formattedMonth = String(month + 1).padStart(2, '0');
        let formattedDay = String(day).padStart(2, '0');
        let dateString = `${year}-${formattedMonth}-${formattedDay}`;

        let dayExams = exams.filter(ex => ex.date === dateString);
        let dayEvents = calendarEvents.filter(ev => ev.date === dateString);

        let indicators = '';
        dayExams.forEach(ex => {
            indicators += `<div style="background-color: #ffb7c5; color: #333; font-size: 0.9rem; padding: 2px 4px; border-radius: 4px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Prüfung: ${ex.name}</div>`;
        });
        dayEvents.forEach((ev, evIdx) => {
            indicators += `<div style="background-color: ${ev.color}; color: #333; font-size: 0.9rem; padding: 2px 4px; border-radius: 4px; margin-top: 2px; display: flex; justify-content: space-between; align-items: center;">
                <span>${ev.title}</span>
                <button onclick="deleteEvent(${ev.globalIdx})" style="border:none; background:none; cursor:pointer; font-size:0.8rem;">×</button>
            </div>`;
        });

        daysHtml += `
            <div style="background: white; min-height: 80px; border: 1px solid #ddd; border-radius: 8px; padding: 5px; overflow: hidden;">
                <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 2px;">${day}</div>
                ${indicators}
            </div>
        `;
    }

    document.getElementById('content').innerHTML = `
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div style="background: white; padding: 25px; border-radius: 15px; flex-grow: 1; min-width: 500px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <button onclick="changeMonth(-1)" style="background-color: var(--tuerkis); border: none; padding: 6px 12px; border-radius: 8px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">&larr; Letzter Monat</button>
                    <h3 style="margin: 0; font-size: 1.8rem;">${monthNames[month]} ${year}</h3>
                    <button onclick="changeMonth(1)" style="background-color: var(--tuerkis); border: none; padding: 6px 12px; border-radius: 8px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer;">Nächster Monat &rarr;</button>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-weight: bold; font-size: 1.2rem; margin-bottom: 10px;">
                    <div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;">
                    ${daysHtml}
                </div>
            </div>

            <div style="background: white; padding: 25px; border-radius: 15px; width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); height: fit-content;">
                <h3>Termin eintragen</h3>
                <input type="text" id="event-title" placeholder="Fach / Titel..." style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                <input type="date" id="event-date" style="font-family: 'Caveat', cursive; font-size: 1.2rem; padding: 5px; width: 100%; margin-bottom: 10px;">
                <label style="font-size: 1.1rem; display: block; margin-bottom: 5px;">Farbe wählen:</label>
                <input type="color" id="event-color" value="#afeeee" style="width: 100%; height: 40px; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 15px;">
                <button onclick="addCalendarEvent()" style="background-color: var(--tuerkis); border: none; padding: 8px 15px; border-radius: 10px; font-family: 'Caveat', cursive; font-size: 1.2rem; cursor: pointer; width: 100%;">Termin speichern</button>
            </div>
        </div>
    `;
}

function changeMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendarPage();
}

function addCalendarEvent() {
    let title = document.getElementById('event-title').value;
    let date = document.getElementById('event-date').value;
    let color = document.getElementById('event-color').value;

    if (title && date) {
        calendarEvents.push({ title, date, color });
        localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents));
        renderCalendarPage();
    } else {
        alert("Bitte Titel und Datum angeben!");
    }
}

function deleteEvent(idx) {
    calendarEvents.splice(idx, 1);
    localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents));
    renderCalendarPage();
}

function generateChartHtml() {
    let maxTime = Math.max(...exams.map(ex => ex.timeSpent || 0), 60);
    return exams.map(ex => {
        let heightPercent = Math.max(15, Math.round(((ex.timeSpent || 0) / maxTime) * 110));
        let totalMinutes = Math.round((ex.timeSpent || 0) / 60);
        return `
            <div style="display: flex; flex-direction: column; align-items: center; margin: 0 10px;">
                <span style="font-size: 0.9rem; margin-bottom: 3px;">${totalMinutes}m</span>
                <div style="width: 35px; height: ${heightPercent}px; background-color: var(--tuerkis); border-radius: 8px 8px 0 0; transition: height 0.3s;"></div>
                <span style="font-size: 1.1rem; margin-top: 3px; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ex.name}</span>
            </div>
        `;
    }).join('');
}

function calculateOverallAverage() {
    if (grades.length === 0) return 'Keine Noten vorhanden';
    let sum = grades.reduce((acc, g) => acc + Number(g.grade), 0);
    return (sum / grades.length).toFixed(2);
}

function addNewExam() {
    let name = document.getElementById('new-ex-name').value;
    let type = document.getElementById('new-ex-type').value;
    let date = document.getElementById('new-ex-date').value;
    if (name && type && date) {
        exams.push({ name, type, date, timeSpent: 0 });
        localStorage.setItem('exams', JSON.stringify(exams));
        showPage('Noten & Prüfungen');
    } else {
        alert("Bitte alle Felder ausfüllen!");
    }
}

function deleteExam(idx) {
    exams.splice(idx, 1);
    localStorage.setItem('exams', JSON.stringify(exams));
    showPage('Noten & Prüfungen');
}

function addGrade() {
    let subject = document.getElementById('grade-subject').value;
    let type = document.getElementById('grade-type').value;
    let grade = document.getElementById('grade-value').value;
    if (subject && grade) {
        grades.push({ subject, type, grade });
        localStorage.setItem('grades', JSON.stringify(grades));
        showPage('Noten & Prüfungen');
    } else {
        alert("Bitte Fach und Note angeben!");
    }
}

function deleteGrade(globalIdx) {
    grades.splice(globalIdx, 1);
    localStorage.setItem('grades', JSON.stringify(grades));
    showPage('Noten & Prüfungen');
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        let mins = Math.floor(seconds / 60);
        let secs = seconds % 60;
        let timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        let display1 = document.getElementById('quick-timer-display');
        let display2 = document.getElementById('timer-display');
        if (display1) display1.innerText = timeString;
        if (display2) display2.innerText = timeString;
    }, 1000);
}

function stopTimer() {
    let selectBox = document.getElementById('exam-select');
    if (selectBox) {
        let idx = selectBox.value;
        if (idx !== "" && exams[idx]) {
            exams[idx].timeSpent = (exams[idx].timeSpent || 0) + seconds;
            localStorage.setItem('exams', JSON.stringify(exams));
            
            let info = getHolidayCountdownInfo();
            if (!info.inHoliday) {
                let todayStr = new Date().toISOString().split('T')[0];
                if (streakData.lastActiveDate !== todayStr) {
                    streakData.count++;
                    streakData.lastActiveDate = todayStr;
                    localStorage.setItem('streakData', JSON.stringify(streakData));
                }
            }
            
            alert(`Zeit (${Math.floor(seconds/60)} Min.) erfolgreich für ${exams[idx].name} gespeichert!`);
        }
    } else {
        let info = getHolidayCountdownInfo();
        if (!info.inHoliday && seconds > 5) {
            let todayStr = new Date().toISOString().split('T')[0];
            if (streakData.lastActiveDate !== todayStr) {
                streakData.count++;
                streakData.lastActiveDate = todayStr;
                localStorage.setItem('streakData', JSON.stringify(streakData));
            }
        }
        alert("Timer gestoppt.");
    }
    clearInterval(timerInterval);
    seconds = 0;
}

function saveTime() {
    stopTimer();
}

function addTask() {
    let input = document.getElementById('task-input');
    if (input.value.trim() !== '') {
        tasks.push({ text: input.value, completed: false });
        localStorage.setItem('tasks', JSON.stringify(tasks));
        input.value = '';
        renderFullTasks();
    }
}

function toggleTask(index) {
    tasks[index].completed = !tasks[index].completed;
    localStorage.setItem('tasks', JSON.stringify(tasks));
    if(document.getElementById('full-task-list')) {
        renderFullTasks();
    } else {
        renderHomeTodos();
    }
}

function deleteTask(index) {
    tasks.splice(index, 1);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    if(document.getElementById('full-task-list')) {
        renderFullTasks();
    } else {
        renderHomeTodos();
    }
}

function renderHomeTodos() {
    let list = document.getElementById('home-todo-list');
    if (!list) return;
    list.innerHTML = '';
    tasks.forEach((task, index) => {
        let li = document.createElement('li');
        li.style.marginBottom = '6px';
        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="toggleTask(${index})" style="margin-right: 8px; transform: scale(1.1);">
            <span style="${task.completed ? 'text-decoration: line-through; color: #888;' : ''}">${task.text}</span>
        `;
        list.appendChild(li);
    });
}

function renderFullTasks() {
    let list = document.getElementById('full-task-list');
    if (!list) return;
    list.innerHTML = '';
    tasks.forEach((task, index) => {
        let li = document.createElement('li');
        li.style.margin = '10px 0';
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'space-between';
        li.innerHTML = `
            <div>
                <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="toggleTask(${index})" style="margin-right: 10px; transform: scale(1.2);">
                <span style="${task.completed ? 'text-decoration: line-through; color: #888;' : ''}">${task.text}</span>
            </div>
            <button onclick="deleteTask(${index})" style="background-color: var(--pastell-pink); border: none; padding: 4px 10px; border-radius: 8px; font-family: 'Caveat', cursive; font-size: 1rem; cursor: pointer;">Löschen</button>
        `;
        list.appendChild(li);
    });
}

function updateParticipation(subject, count) {
    participation[subject] = count;
    localStorage.setItem('participation', JSON.stringify(participation));
    showPage('Melden');
}

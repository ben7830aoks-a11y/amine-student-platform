/* ==================== ساحة المعارك — متوافق مع index.html وربط مباشر على window ==================== */

window.currentArenaSubMode = window.currentArenaSubMode || 'classic';
window.battleSize = window.battleSize || 1;
window.battleTotalRounds = window.battleTotalRounds || 3;
window.battleRoundIndex = window.battleRoundIndex || 0;
window.battleTimerSec = window.battleTimerSec || 20;
window.battleTimerId = window.battleTimerId || null;
window.autoAdvanceCountdownId = window.autoAdvanceCountdownId || null;
window.battleAnswered = window.battleAnswered || false;
window.battleRoomInfo = window.battleRoomInfo || { name: 'غرفة التحدي السريع', code: '#ROOM-101' };
window.customTeamA = window.customTeamA || [];
window.customTeamB = window.customTeamB || [];
window.battleTeamA = window.battleTeamA || [];
window.battleTeamB = window.battleTeamB || [];
window.battleQuestions = window.battleQuestions || [];
window.battleLogs = window.battleLogs || [];
window.activeAiOpponentId = window.activeAiOpponentId || '#3109';
window.opponentRefsRegistry = window.opponentRefsRegistry || {};
window.aiBattleState = window.aiBattleState || null;
window.aiBattleStepTimerId = window.aiBattleStepTimerId || null;
window.generatedBattleResearchText = window.generatedBattleResearchText || '';

if (typeof window.platformQuestionBank !== 'object' || !window.platformQuestionBank) {
    window.platformQuestionBank = {
        programming: [
            {
                domain: 'البرمجة',
                q: 'ما الغرض الأساسي من استخدام Array.prototype.map في JavaScript؟',
                options: [
                    'تعديل المصفوفة الأصلية في مكانها',
                    'إنشاء مصفوفة جديدة ناتجة عن تطبيق دالة على كل عنصر',
                    'حذف العناصر المكررة من المصفوفة',
                    'إيقاف تنفيذ الحلقة عند أول عنصر'
                ],
                answer: 1
            },
            {
                domain: 'البرمجة',
                q: 'أي مما يلي يمثل خاصية ACID في قواعد البيانات العلائقية؟',
                options: [
                    'الذرية (Atomicity) والاتساق (Consistency)',
                    'التخزين المؤقت فقط',
                    'تحويل HTML إلى JSON',
                    'ضغط الملفات تلقائياً'
                ],
                answer: 0
            },
            {
                domain: 'البرمجة',
                q: 'ما الفرق الأساسي بين let و const في JavaScript؟',
                options: [
                    'const ذات نطاق عام فقط',
                    'let لا تقبل أي قيمة رقمية',
                    'const تمنع إعادة إسناد المتغير في نفس النطاق',
                    'let تعمل فقط داخل الدوال غير المتزامنة'
                ],
                answer: 2
            }
        ],
        math: [
            {
                domain: 'الرياضيات',
                q: 'ما مشتقة الدالة f(x) = 3x² + 5x بالنسبة إلى x؟',
                options: ['6x + 5', '3x + 5', '6x² + 5', '9x'],
                answer: 0
            },
            {
                domain: 'الرياضيات',
                q: 'إذا كان احتمال وقوع حدث هو 0.25، فما احتمال عدم وقوعه؟',
                options: ['0.25', '0.50', '0.75', '1.25'],
                answer: 2
            },
            {
                domain: 'الرياضيات',
                q: 'ما قيمة محدد المصفوفة الثنائية [[4, 2], [1, 3]]؟',
                options: ['6', '10', '12', '14'],
                answer: 1
            }
        ]
    };
}

function wbEscapeHtml(str) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function wbToast(msg, isError = false) {
    if (typeof window.showToast === 'function') {
        window.showToast(msg, isError);
    } else {
        console[isError ? 'warn' : 'log'](msg);
    }
}

function wbAppendNote(text, toastMsg) {
    if (typeof window.appendToActiveNote === 'function') {
        window.appendToActiveNote(text, toastMsg);
        return;
    }
    const editor = document.getElementById('wordRichEditor');
    if (editor) {
        const p = document.createElement('p');
        p.textContent = text;
        editor.appendChild(p);
        if (typeof window.updateCurrentNoteContent === 'function') {
            window.updateCurrentNoteContent();
        }
    }
    wbToast(toastMsg || 'تم الحفظ في دفتر الملاحظات 📝');
}

/* ==================== التحكم بساحة المعارك ==================== */
window.switchArenaMode = function switchArenaMode(mode) {
    window.currentArenaSubMode = mode;
    const isClassic = mode === 'classic';

    const tabClassic = document.getElementById('arenaTabClassic');
    const tabAi = document.getElementById('arenaTabAiVsAi');
    const classicPanel = document.getElementById('classicBattlePanel');
    const aiPanel = document.getElementById('aiVsAiBattlePanel');

    if (tabClassic) tabClassic.classList.toggle('active-arena-tab', isClassic);
    if (tabAi) tabAi.classList.toggle('active-arena-tab', !isClassic);
    if (classicPanel) classicPanel.classList.toggle('hidden', !isClassic);
    if (aiPanel) aiPanel.classList.toggle('hidden', isClassic);

    if (!isClassic) {
        window.loadOpponentRefsRegistry();
        window.syncAiOpponentUi(window.activeAiOpponentId);
    }
};

window.updateRoundsFromBar = function updateRoundsFromBar() {
    const val = parseInt(document.getElementById('battleRoundsSelect')?.value || String(window.battleTotalRounds || 3), 10) || 3;
    window.battleTotalRounds = val;
    const badge = document.getElementById('battleRoundsBadge');
    if (badge) badge.textContent = `${window.battleTotalRounds} جولات`;
};

window.updateBattleRoomBanner = function updateBattleRoomBanner() {
    const nameEl = document.getElementById('battleRoomNameDisplay');
    const codeEl = document.getElementById('battleRoomCodeBadge');
    const roundsEl = document.getElementById('battleRoundsBadge');
    const sel = document.getElementById('battleRoundsSelect');

    if (nameEl) nameEl.textContent = window.battleRoomInfo.name;
    if (codeEl) codeEl.textContent = window.battleRoomInfo.code;
    if (roundsEl) roundsEl.textContent = `${window.battleTotalRounds} جولات`;
    if (sel) sel.value = String(window.battleTotalRounds);
};

window.openCreateBattleRoomModal = function openCreateBattleRoomModal() {
    const nameInp = document.getElementById('newBattleRoomName');
    const modeSel = document.getElementById('newBattleRoomMode');
    const roundsSel = document.getElementById('newBattleRoomRounds');
    const domSel = document.getElementById('newBattleRoomDomain');

    if (nameInp) nameInp.value = '';
    if (modeSel) modeSel.value = String(window.battleSize);
    if (roundsSel) roundsSel.value = String(window.battleTotalRounds);
    if (domSel) domSel.value = document.getElementById('battleDomainSelect')?.value || 'programming';

    document.getElementById('createBattleRoomModal')?.classList.remove('hidden');
};

window.closeCreateBattleRoomModal = function closeCreateBattleRoomModal() {
    document.getElementById('createBattleRoomModal')?.classList.add('hidden');
};

window.submitCreateBattleRoom = function submitCreateBattleRoom() {
    const rawName = (document.getElementById('newBattleRoomName')?.value || '').trim();
    const modeVal = parseInt(document.getElementById('newBattleRoomMode')?.value || '1', 10) || 1;
    const roundsVal = parseInt(document.getElementById('newBattleRoomRounds')?.value || '3', 10) || 3;
    const domVal = document.getElementById('newBattleRoomDomain')?.value || 'programming';

    const code = `#ROOM-${Math.floor(100 + Math.random() * 900)}`;
    window.battleRoomInfo = { name: rawName || `غرفة التحدي ${code}`, code };
    window.battleTotalRounds = roundsVal;

    const domSel = document.getElementById('battleDomainSelect');
    if (domSel) domSel.value = domVal;

    window.updateBattleRoomBanner();
    window.selectBattleSize(modeVal);
    window.closeCreateBattleRoomModal();
    wbToast(`تم إنشاء ${window.battleRoomInfo.name} (${code}) 🏠`);
};

window.openAddCompetitorModal = function openAddCompetitorModal() {
    const inp = document.getElementById('competitorNameOrIdInput');
    const teamSel = document.getElementById('competitorTargetTeam');
    const hint = document.getElementById('competitorCapacityHint');

    if (inp) inp.value = '';
    if (teamSel) teamSel.value = 'B';
    if (hint) hint.textContent = `الوضع الحالي: ${window.battleSize} vs ${window.battleSize} (الحد الأقصى لكل فريق ${window.battleSize} لاعبين)`;

    document.getElementById('addCompetitorModal')?.classList.remove('hidden');
    if (inp) setTimeout(() => inp.focus(), 30);
};

window.closeAddCompetitorModal = function closeAddCompetitorModal() {
    document.getElementById('addCompetitorModal')?.classList.add('hidden');
};

window.submitAddCompetitor = function submitAddCompetitor() {
    const raw = (document.getElementById('competitorNameOrIdInput')?.value || '').trim();
    const team = document.getElementById('competitorTargetTeam')?.value || 'B';
    if (!raw) {
        wbToast('اكتب اسم المتنافس أو الـ ID أولاً', true);
        return;
    }

    const targetList = team === 'A' ? window.customTeamA : window.customTeamB;
    if (targetList.length >= window.battleSize) {
        wbToast(`الفريق مكتمل في نمط ${window.battleSize} vs ${window.battleSize}! غيّر النمط أو احذف لاعباً أولاً`, true);
        return;
    }

    let name = raw;
    let studentId = '#' + Math.floor(2000 + Math.random() * 7999);
    const idMatch = raw.match(/#\d{2,6}/);
    if (idMatch) {
        studentId = idMatch[0];
        const cleanName = raw.replace(idMatch[0], '').trim();
        name = cleanName || `طالب ${studentId}`;
    } else if (/^\d{3,6}$/.test(raw)) {
        studentId = '#' + raw;
        name = `طالب ${studentId}`;
    }

    targetList.push({ name, studentId, score: 0, isUser: false, isCustom: true });
    window.closeAddCompetitorModal();
    window.setupBattleTeams();
    wbToast(`تمت إضافة ${name} (${studentId}) إلى الفريق ${team === 'A' ? 'Alpha' : 'Omega'} ➕`);
};

window.removeCustomCompetitor = function removeCustomCompetitor(team, idx) {
    if (team === 'A') window.customTeamA.splice(idx, 1);
    else window.customTeamB.splice(idx, 1);
    window.setupBattleTeams();
    wbToast('تمت إزالة المتنافس');
};

window.selectBattleSize = function selectBattleSize(size) {
    window.battleSize = size;

    document.querySelectorAll('.battle-mode-btn').forEach(b => b.classList.remove('active-mode'));
    const btn = document.getElementById(`modeBtn${size}v${size}`);
    if (btn) btn.classList.add('active-mode');

    const label = document.getElementById('battleModeLabel');
    if (label) label.textContent = `${size} vs ${size}`;

    window.customTeamA = window.customTeamA.slice(0, size);
    window.customTeamB = window.customTeamB.slice(0, size);

    window.setupBattleTeams();
};

window.setupBattleTeams = function setupBattleTeams() {
    const user = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
    const userName = user ? user.username : (document.getElementById('navUsername')?.textContent?.trim() || 'أنت');
    const userId = user ? user.id : '#1001';

    const poolA = [
        { name: userName, studentId: userId, isUser: true },
        { name: 'سارة منصور', studentId: '#2045' },
        { name: 'كريم بن علي', studentId: '#3109' },
        { name: 'ليلى مراد', studentId: '#4412' }
    ];
    const poolB = [
        { name: 'منافس الساحة', studentId: '#5102' },
        { name: 'ياسين قاسمي', studentId: '#6218' },
        { name: 'نور الهدى', studentId: '#7319' },
        { name: 'آدم كريم', studentId: '#8420' }
    ];

    window.battleTeamA = [];
    window.battleTeamB = [];

    for (let i = 0; i < window.battleSize; i++) {
        window.battleTeamA.push({ ...(window.customTeamA[i] || poolA[i]), score: 0 });
        window.battleTeamB.push({ ...(window.customTeamB[i] || poolB[i]), score: 0 });
    }

    window.renderBattleTeams();
};

window.renderBattleTeams = function renderBattleTeams() {
    const listA = document.getElementById('teamAPlayersList');
    const listB = document.getElementById('teamBPlayersList');
    if (!listA || !listB) return;

    listA.innerHTML = '';
    listB.innerHTML = '';

    let scoreA = 0;
    let scoreB = 0;

    window.battleTeamA.forEach((p, idx) => {
        const pScore = Number(p.score) || 0;
        scoreA += pScore;
        const div = document.createElement('div');
        div.className = 'player-slot';
        const canDel = !p.isUser && window.customTeamA.some(c => c.studentId === p.studentId);
        div.innerHTML = `
            <div>
                <span>${p.isUser ? '👤 ' : '🎓 '}<strong>${wbEscapeHtml(p.name)}</strong></span>
                <span class="player-id-pill">${wbEscapeHtml(p.studentId)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <strong style="color:#38bdf8;">${pScore} ن</strong>
                ${canDel ? `<button type="button" onclick="removeCustomCompetitor('A', ${idx})" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-size:12px;">✕</button>` : ''}
            </div>
        `;
        listA.appendChild(div);
    });

    window.battleTeamB.forEach((p, idx) => {
        const pScore = Number(p.score) || 0;
        scoreB += pScore;
        const div = document.createElement('div');
        div.className = 'player-slot';
        const canDel = p.isCustom || window.customTeamB.some(c => c.studentId === p.studentId);
        div.innerHTML = `
            <div>
                <span>🤖 <strong>${wbEscapeHtml(p.name)}</strong></span>
                <span class="player-id-pill">${wbEscapeHtml(p.studentId)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <strong style="color:#fb7185;">${pScore} ن</strong>
                ${canDel ? `<button type="button" onclick="removeCustomCompetitor('B', ${idx})" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-size:12px;">✕</button>` : ''}
            </div>
        `;
        listB.appendChild(div);
    });

    const badgeA = document.getElementById('teamAScoreBadge');
    const badgeB = document.getElementById('teamBScoreBadge');
    if (badgeA) badgeA.textContent = `${scoreA} نقطة`;
    if (badgeB) badgeB.textContent = `${scoreB} نقطة`;
};

window.clearBattleTimers = function clearBattleTimers() {
    clearInterval(window.battleTimerId);
    clearInterval(window.autoAdvanceCountdownId);
};

window.startNewBattle = function startNewBattle() {
    window.clearBattleTimers();
    window.updateRoundsFromBar();

    if (!window.battleTeamA.length || !window.battleTeamB.length) {
        window.setupBattleTeams();
    } else {
        window.battleTeamA.forEach(p => { p.score = 0; });
        window.battleTeamB.forEach(p => { p.score = 0; });
        window.renderBattleTeams();
    }

    const domain = document.getElementById('battleDomainSelect')?.value || 'programming';
    const bank = window.platformQuestionBank || {};
    let sourcePool = [];
    if (domain === 'programming') sourcePool = [...(bank.programming || [])];
    else if (domain === 'math') sourcePool = [...(bank.math || [])];
    else sourcePool = [...(bank.programming || []), ...(bank.math || [])];

    if (!sourcePool.length) {
        sourcePool = [...(bank.programming || []), ...(bank.math || [])];
    }

    sourcePool.sort(() => Math.random() - 0.5);
    window.battleQuestions = [];
    for (let i = 0; i < window.battleTotalRounds; i++) {
        window.battleQuestions.push(sourcePool[i % sourcePool.length]);
    }

    window.battleRoundIndex = 0;
    window.battleLogs = [];

    document.getElementById('battleSummaryArea')?.classList.add('hidden');
    document.getElementById('battleActiveArea')?.classList.remove('hidden');

    window.loadBattleRound();
    wbToast(`بدأت المعركة (${window.battleTotalRounds} جولات) في ${window.battleRoomInfo.name} 🔥`);
};

window.loadBattleRound = function loadBattleRound() {
    window.clearBattleTimers();
    window.battleAnswered = false;

    const qObj = window.battleQuestions[window.battleRoundIndex];
    if (!qObj) return;

    const letters = ['A', 'B', 'C', 'D'];
    const roundInfo = document.getElementById('battleRoundInfo');
    const qText = document.getElementById('battleQuestionText');
    const feedback = document.getElementById('battleRoundFeedback');
    const autoBanner = document.getElementById('autoNextRoundBanner');
    const cantBtn = document.getElementById('cantAnswerBtn');
    const timerBadge = document.getElementById('battleTimerBadge');
    const grid = document.getElementById('battleOptionsGrid');

    if (roundInfo) roundInfo.textContent = `الجولة ${window.battleRoundIndex + 1} / ${window.battleTotalRounds} — ${qObj.domain}`;
    if (qText) qText.textContent = qObj.q;
    if (feedback) feedback.innerHTML = '';
    if (autoBanner) autoBanner.classList.add('hidden');
    if (cantBtn) cantBtn.disabled = false;

    if (grid) {
        grid.innerHTML = '';
        (qObj.options || []).forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'battle-opt-btn';
            btn.innerHTML = `<span class="opt-letter">${letters[idx]}</span><span>${wbEscapeHtml(opt)}</span>`;
            btn.onclick = () => window.submitBattleChoice(idx);
            grid.appendChild(btn);
        });
    }

    window.battleTimerSec = 20;
    if (timerBadge) timerBadge.textContent = `⏱️ ${window.battleTimerSec} ثانية`;

    window.battleTimerId = setInterval(() => {
        window.battleTimerSec--;
        if (timerBadge) timerBadge.textContent = `⏱️ ${window.battleTimerSec} ثانية`;
        if (window.battleTimerSec <= 0) {
            clearInterval(window.battleTimerId);
            if (!window.battleAnswered) window.handleRoundTimeout();
        }
    }, 1000);
};

window.lockBattleOptions = function lockBattleOptions() {
    document.querySelectorAll('#battleOptionsGrid .battle-opt-btn').forEach(b => { b.disabled = true; });
    const cantBtn = document.getElementById('cantAnswerBtn');
    if (cantBtn) cantBtn.disabled = true;
};

window.scheduleAutoAdvanceRound = function scheduleAutoAdvanceRound(isLastRound) {
    let secLeft = 3;
    const banner = document.getElementById('autoNextRoundBanner');
    if (banner) {
        banner.classList.remove('hidden');
        banner.textContent = isLastRound
            ? `⏳ انتهت جميع الجولات... عرض التقرير النهائي خلال ${secLeft} ثوانٍ`
            : `⏳ الانتقال تلقائياً إلى الجولة التالية خلال ${secLeft} ثوانٍ...`;
    }

    clearInterval(window.autoAdvanceCountdownId);
    window.autoAdvanceCountdownId = setInterval(() => {
        secLeft--;
        if (secLeft > 0) {
            if (banner) {
                banner.textContent = isLastRound
                    ? `⏳ عرض التقرير النهائي خلال ${secLeft} ثوانٍ...`
                    : `⏳ الانتقال تلقائياً إلى الجولة التالية خلال ${secLeft} ثوانٍ...`;
            }
        } else {
            clearInterval(window.autoAdvanceCountdownId);
            if (isLastRound) {
                window.finishBattle();
            } else {
                window.battleRoundIndex++;
                window.loadBattleRound();
            }
        }
    }, 1000);
};

window.submitBattleChoice = function submitBattleChoice(choiceIdx) {
    if (window.battleAnswered) return;
    window.battleAnswered = true;
    window.clearBattleTimers();
    window.lockBattleOptions();

    const qObj = window.battleQuestions[window.battleRoundIndex];
    if (!qObj) return;

    const isCorrect = choiceIdx === qObj.answer;
    const letters = ['A', 'B', 'C', 'D'];
    const userPlayer = window.battleTeamA[0] || { score: 0 };
    const rivalPlayer = window.battleTeamB[0] || { score: 0 };
    const feedback = document.getElementById('battleRoundFeedback');

    let rivalSuccess = false;
    if (isCorrect) {
        userPlayer.score = (Number(userPlayer.score) || 0) + 10;
        rivalSuccess = Math.random() < 0.35;
        if (rivalSuccess) rivalPlayer.score = (Number(rivalPlayer.score) || 0) + 10;
        if (feedback) {
            feedback.innerHTML = `<span style="color:#10b981;font-weight:bold;">✅ إجابة صحيحة! (+10 نقاط لفريق Alpha)</span>`;
        }
    } else {
        rivalSuccess = Math.random() < 0.75;
        if (rivalSuccess) rivalPlayer.score = (Number(rivalPlayer.score) || 0) + 10;
        if (feedback) {
            feedback.innerHTML = `<span style="color:#f87171;font-weight:bold;">❌ إجابة خاطئة! الإجابة الصحيحة هي (${letters[qObj.answer]}): ${wbEscapeHtml(qObj.options[qObj.answer])}</span>`;
        }
    }

    window.battleLogs.push({
        round: window.battleRoundIndex + 1,
        question: qObj.q,
        correctText: `(${letters[qObj.answer]}) ${qObj.options[qObj.answer]}` ,
        userCorrect: isCorrect,
        cantAnswer: false,
        rivalSuccess
    });

    window.renderBattleTeams();
    window.scheduleAutoAdvanceRound(window.battleRoundIndex >= window.battleTotalRounds - 1);
};

window.declareCantAnswer = function declareCantAnswer() {
    if (window.battleAnswered) return;
    window.battleAnswered = true;
    window.clearBattleTimers();
    window.lockBattleOptions();

    const qObj = window.battleQuestions[window.battleRoundIndex];
    if (!qObj) return;

    const letters = ['A', 'B', 'C', 'D'];
    if (window.battleTeamB[0]) window.battleTeamB[0].score = (Number(window.battleTeamB[0].score) || 0) + 10;

    const feedback = document.getElementById('battleRoundFeedback');
    if (feedback) {
        feedback.innerHTML = `<span style="color:#fbbf24;font-weight:bold;">🏳️ أعلنت عدم قدرتك على الإجابة. (+10 نقاط للفريق المنافس) — الإجابة الصحيحة: ${wbEscapeHtml(qObj.options[qObj.answer])}</span>`;
    }

    window.battleLogs.push({
        round: window.battleRoundIndex + 1,
        question: qObj.q,
        correctText: `(${letters[qObj.answer]}) ${qObj.options[qObj.answer]}` ,
        userCorrect: false,
        cantAnswer: true,
        rivalSuccess: true
    });

    window.renderBattleTeams();
    window.scheduleAutoAdvanceRound(window.battleRoundIndex >= window.battleTotalRounds - 1);
};

window.handleRoundTimeout = function handleRoundTimeout() {
    if (window.battleAnswered) return;
    window.battleAnswered = true;
    window.lockBattleOptions();

    const qObj = window.battleQuestions[window.battleRoundIndex];
    if (!qObj) return;

    const letters = ['A', 'B', 'C', 'D'];
    if (window.battleTeamB[0]) window.battleTeamB[0].score = (Number(window.battleTeamB[0].score) || 0) + 10;

    const feedback = document.getElementById('battleRoundFeedback');
    if (feedback) {
        feedback.innerHTML = `<span style="color:#fbbf24;font-weight:bold;">⏰ انتهى الوقت! (+10 نقاط للفريق المنافس) — الإجابة الصحيحة: ${wbEscapeHtml(qObj.options[qObj.answer])}</span>`;
    }

    window.battleLogs.push({
        round: window.battleRoundIndex + 1,
        question: qObj.q,
        correctText: `(${letters[qObj.answer]}) ${qObj.options[qObj.answer]}` ,
        userCorrect: false,
        cantAnswer: false,
        rivalSuccess: true
    });

    window.renderBattleTeams();
    window.scheduleAutoAdvanceRound(window.battleRoundIndex >= window.battleTotalRounds - 1);
};

window.finishBattle = function finishBattle() {
    window.clearBattleTimers();
    document.getElementById('battleActiveArea')?.classList.add('hidden');

    const scoreA = window.battleTeamA.reduce((s, p) => s + (Number(p.score) || 0), 0);
    const scoreB = window.battleTeamB.reduce((s, p) => s + (Number(p.score) || 0), 0);
    const userWon = scoreA > scoreB;
    const isDraw = scoreA === scoreB;

    let headline = '⚠️ خسارة فريق Alpha أمام الفريق المنافس';
    let headlineColor = '#f87171';
    if (isDraw) {
        headline = '🤝 تعادل مثير!';
        headlineColor = '#fbbf24';
    } else if (userWon) {
        headline = '🏆 مبروك! فريق Alpha حسم المعركة!';
        headlineColor = '#10b981';
    }

    const missedItems = window.battleLogs.filter(l => !l.userCorrect);
    let missedHtml = '';
    if (missedItems.length > 0) {
        missedHtml = `
            <div class="loser-highlight-card">
                <h4 style="color:#f87171;margin-bottom:8px;font-size:14px;">📌 الأسئلة التي لم تُجب عليها أو أخطأت فيها:</h4>
                ${missedItems.map(m => `
                    <div style="background:rgba(15,23,42,0.7);padding:10px;border-radius:8px;margin-bottom:8px;font-size:13px;">
                        <div><strong>الجولة ${m.round}:</strong> ${wbEscapeHtml(m.question)}</div>
                        <div style="color:#34d399;margin-top:4px;">✅ الإجابة الصحيحة: ${wbEscapeHtml(m.correctText)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        missedHtml = `<div class="card" style="background:rgba(16,185,129,0.12);border-color:#10b981;margin-top:12px;"><strong style="color:#34d399;">🌟 أداء مثالي! أجبت عن جميع الأسئلة بشكل صحيح.</strong></div>`;
    }

    const summaryEl = document.getElementById('battleSummaryArea');
    if (summaryEl) {
        summaryEl.classList.remove('hidden');
        summaryEl.innerHTML = `
            <div class="card" style="border-color:${headlineColor};">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                    <h3 style="color:${headlineColor};font-size:19px;margin:0;">${headline}</h3>
                    <strong style="font-size:15px;">النتيجة: Alpha ${scoreA} — ${scoreB} Omega</strong>
                </div>
                ${missedHtml}
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
                    <button type="button" class="btn" onclick="startNewBattle()" style="width:auto;background:#10b981;">🔄 معركة جديدة</button>
                    <button type="button" class="send-to-note-btn" onclick="saveBattleSummaryToNote()">📝 حفظ ملخص المعركة في الملاحظات</button>
                </div>
            </div>
        `;
    }
};

window.saveBattleSummaryToNote = function saveBattleSummaryToNote() {
    const scoreA = window.battleTeamA.reduce((s, p) => s + (Number(p.score) || 0), 0);
    const scoreB = window.battleTeamB.reduce((s, p) => s + (Number(p.score) || 0), 0);
    const lines = [`⚔️ ملخص معركة (${window.battleRoomInfo.name} - ${window.battleSize}v${window.battleSize}): Alpha ${scoreA} - ${scoreB} Omega`];
    window.battleLogs.forEach(l => lines.push(`• الجولة ${l.round}: ${l.question} | الصحيح: ${l.correctText}`));
    wbAppendNote(lines.join('\n'), 'تم حفظ ملخص المعركة في دفتر الملاحظات 📝');
};

/* ==================== معركة AI ضد AI حسب الـ ID ==================== */
window.getDefaultOpponentProfile = function getDefaultOpponentProfile(normId) {
    const presets = {
        '#3109': {
            id: '#3109',
            name: 'ياسين قاسمي',
            agentName: 'وكيل الخصم — ياسين قاسمي (#3109)',
            sources: 'المصدر 1: المعمارية المعيارية وقابلية التوسع تمنع إعادة البناء المكلفة.\nالمصدر 2: توثيق الواجهات والاختبارات الآلية يحافظ على استقرار المشروع عند نمو الفريق.'
        },
        '#2045': {
            id: '#2045',
            name: 'سارة منصور',
            agentName: 'وكيل الخصم — سارة منصور (#2045)',
            sources: 'المصدر 1: تجربة المستخدم الواضحة وتقليل خطوات التفاعل يرفعان كفاءة التعلّم.\nالمصدر 2: التغذية الراجعة الفورية تساعد الطالب على تصحيح المفاهيم فوراً.'
        },
        '#7312': {
            id: '#7312',
            name: 'سمير منصوري',
            agentName: 'وكيل الخصم — سمير منصوري (#7312)',
            sources: 'المصدر 1: الموازنة بين البساطة والمرونة تجعل المشروع قابلاً للتشغيل على مختلف الأجهزة.\nالمصدر 2: التحقق من المدخلات والأمان يحمي بيانات المستخدمين.'
        }
    };
    if (presets[normId]) return presets[normId];
    return {
        id: normId,
        name: `الخصم ${normId}`,
        agentName: `وكيل الخصم (${normId})`,
        sources: `المصدر 1 (${normId}): تحليل المشكلة من زاوية الكفاءة العملية وسهولة الصيانة.\nالمصدر 2 (${normId}): دعم القرارات التقنية بأمثلة قابلة للقياس والتحقق.'
    };
};

window.loadOpponentRefsRegistry = function loadOpponentRefsRegistry() {
    try {
        const saved = JSON.parse(localStorage.getItem('smartStudentOpponentRefs') || 'null');
        window.opponentRefsRegistry = (saved && typeof saved === 'object') ? saved : {};
    } catch (_) {
        window.opponentRefsRegistry = {};
    }
};

window.saveOpponentRefsRegistry = function saveOpponentRefsRegistry() {
    try {
        localStorage.setItem('smartStudentOpponentRefs', JSON.stringify(window.opponentRefsRegistry));
    } catch (_) {}
};

window.normalizeOpponentId = function normalizeOpponentId(raw) {
    const cleaned = String(raw || '').trim();
    if (!cleaned) return '';
    return cleaned.startsWith('#') ? cleaned : '#' + cleaned.replace(/^#/, '');
};

window.syncAiOpponentUi = function syncAiOpponentUi(rawId) {
    const normId = window.normalizeOpponentId(rawId) || '#3109';
    window.activeAiOpponentId = normId;

    const profile = window.opponentRefsRegistry[normId] || window.getDefaultOpponentProfile(normId);
    const inpId = document.getElementById('aiOpponentIdInput');
    const badge = document.getElementById('aiOpponentLinkedBadge');
    const titleSpan = document.getElementById('aiOpponentDisplayTitle');
    const nameInp = document.getElementById('ai2NameInput');
    const srcInp = document.getElementById('ai2SourcesInput');

    if (badge) badge.textContent = `الخصم المرتبط: ${profile.name} (${normId})`;
    if (titleSpan) titleSpan.textContent = `${profile.name} ${normId}`;
    if (nameInp) nameInp.value = profile.agentName || `وكيل الخصم — ${profile.name} (${normId})`;
    if (srcInp) srcInp.value = profile.sources || '';
};

window.addAiOpponentById = function addAiOpponentById() {
    const raw = document.getElementById('aiOpponentIdInput')?.value || '';
    const normId = window.normalizeOpponentId(raw);
    if (!normId) {
        wbToast('أدخل ID الخصم أولاً (مثال: #2045)', true);
        return;
    }
    if (!window.opponentRefsRegistry[normId]) {
        window.opponentRefsRegistry[normId] = window.getDefaultOpponentProfile(normId);
        window.saveOpponentRefsRegistry();
    }
    window.syncAiOpponentUi(normId);
    wbToast(`تم ربط الخصم ${window.opponentRefsRegistry[normId].name} (${normId}) ومراجعه بنجاح 🆔`);
};    if (inpId) inpId.value = normId;

window.saveOpponentIdRefs = function saveOpponentIdRefs() {
    const normId = window.normalizeOpponentId(document.getElementById('aiOpponentIdInput')?.value || window.activeAiOpponentId) || '#3109';
    const agentName = (document.getElementById('ai2NameInput')?.value || '').trim();
    const sources = (document.getElementById('ai2SourcesInput')?.value || '').trim();
    const existing = window.opponentRefsRegistry[normId] || window.getDefaultOpponentProfile(normId);

    window.opponentRefsRegistry[normId] = {
        ...existing,
        id: normId,
        agentName: agentName || existing.agentName,
        sources: sources || existing.sources
    };
    window.activeAiOpponentId = normId;
    window.saveOpponentRefsRegistry();
    window.syncAiOpponentUi(normId);
    wbToast(`تم حفظ مراجع الخصم ${normId} 💾`);
};

window.loadCurrentNoteIntoAiSource = function loadCurrentNoteIntoAiSource(slot) {
    const editorText = document.getElementById('wordRichEditor')?.innerText?.trim() || '';
    const text = editorText || 'ملاحظة دراسية حول هيكلة المشروع وتحسين الأداء.';
    if (slot === 1) {
        const src1 = document.getElementById('ai1SourcesInput');
        if (src1) src1.value = text.slice(0, 600);
        wbToast('تم سحب محتوى ملاحظتك إلى وكيلك الأول 📥');
    } else {
        const src2 = document.getElementById('ai2SourcesInput');
        if (src2) src2.value = text.slice(0, 600);
        window.saveOpponentIdRefs();
    }
};

window.parseSourcesList = function parseSourcesList(rawText) {
    const lines = String(rawText || '').split(/\r?\n+/).map(l => l.trim()).filter(Boolean);
    return lines.length ? lines : ['مرجع عام داعم للحجة التحليلية.'];
};

window.startAiVsAiBattle = function startAiVsAiBattle() {
    clearTimeout(window.aiBattleStepTimerId);
    const topic = (document.getElementById('aiBattleTopicInput')?.value || '').trim() || 'موضوع بحثي مقارن';
    const rounds = parseInt(document.getElementById('aiBattleRoundsSelect')?.value || '3', 10) || 3;
    const ai1Name = (document.getElementById('ai1NameInput')?.value || 'AI-Alpha').trim();
    const ai2Name = (document.getElementById('ai2NameInput')?.value || `وكيل الخصم (${window.activeAiOpponentId})`).trim();
    const ai1Sources = window.parseSourcesList(document.getElementById('ai1SourcesInput')?.value);
    const ai2Sources = window.parseSourcesList(document.getElementById('ai2SourcesInput')?.value);

    window.aiBattleState = {
        topic,
        totalRounds: rounds,
        currentRound: 1,
        ai1: { name: ai1Name, sources: ai1Sources, hp: 100, score: 0, arguments: [] },
        ai2: { name: ai2Name, opponentId: window.activeAiOpponentId, sources: ai2Sources, hp: 100, score: 0, arguments: [] },
        roundRecords: []
    };

    window.updateAiFightersHud();
    const feed = document.getElementById('aiBattleTurnsFeed');
    const resBox = document.getElementById('aiBattleResearchResult');
    const banner = document.getElementById('aiBattleAutoBanner');
    const liveArea = document.getElementById('aiBattleLiveArea');

    if (feed) feed.innerHTML = '';
    if (resBox) resBox.classList.add('hidden');
    if (banner) banner.classList.add('hidden');
    if (liveArea) liveArea.classList.remove('hidden');

    window.runNextAiDebateRound();
};

window.updateAiFightersHud = function updateAiFightersHud() {
    if (!window.aiBattleState) return;
    const { ai1, ai2 } = window.aiBattleState;
    const hp1Text = document.getElementById('ai1HpText');
    const sc1Text = document.getElementById('ai1ScoreText');
    const hp1Bar = document.getElementById('ai1HpBar');
    const hp2Text = document.getElementById('ai2HpText');
    const sc2Text = document.getElementById('ai2ScoreText');
    const hp2Bar = document.getElementById('ai2HpBar');

    if (hp1Text) hp1Text.textContent = ai1.hp;
    if (sc1Text) sc1Text.textContent = ai1.score;
    if (hp1Bar) hp1Bar.style.width = `${Math.max(0, ai1.hp)}%`;
    if (hp2Text) hp2Text.textContent = ai2.hp;
    if (sc2Text) sc2Text.textContent = ai2.score;
    if (hp2Bar) hp2Bar.style.width = `${Math.max(0, ai2.hp)}%`;
};

window.runNextAiDebateRound = function runNextAiDebateRound() {
    if (!window.aiBattleState) return;
    const r = window.aiBattleState.currentRound;
    const total = window.aiBattleState.totalRounds;
    const badge = document.getElementById('aiBattleRoundBadge');
    if (badge) badge.textContent = `الجولة ${r} / ${total}`;

    const s1 = window.aiBattleState.ai1.sources[(r - 1) % window.aiBattleState.ai1.sources.length];
    const s2 = window.aiBattleState.ai2.sources[(r - 1) % window.aiBattleState.ai2.sources.length];
    const arg1 = `وفق (${s1})، فإن تطبيق هذا المبدأ في "${window.aiBattleState.topic}" يعزز جودة التنفيذ ويقلل الأخطاء المبكرة.`;
    const arg2 = `بالاستناد إلى (${s2})، فإن مراعاة هذا الجانب في "${window.aiBattleState.topic}" تضمن الاستدامة وتوازن المتطلبات العملية.`;

    const dmg1 = 14 + ((r * 5) % 10);
    const dmg2 = 14 + (((r + 2) * 5) % 10);
    window.aiBattleState.ai1.score += 15;
    window.aiBattleState.ai2.score += 15;
    window.aiBattleState.ai1.hp = Math.max(15, window.aiBattleState.ai1.hp - dmg2);
    window.aiBattleState.ai2.hp = Math.max(15, window.aiBattleState.ai2.hp - dmg1);
    window.aiBattleState.ai1.arguments.push({ round: r, source: s1, claim: arg1 });
    window.aiBattleState.ai2.arguments.push({ round: r, source: s2, claim: arg2 });
    window.aiBattleState.roundRecords.push({ round: r, s1, s2, arg1, arg2 });

    const feed = document.getElementById('aiBattleTurnsFeed');
    if (feed) {
        const card = document.createElement('div');
        card.className = 'debate-turn-box';
        card.innerHTML = `
            <div style="color:var(--accent);font-weight:bold;margin-bottom:6px;">⚔️ الجولة ${r}</div>
            <div style="margin-bottom:8px;">
                <strong style="color:#38bdf8;">🤖 ${wbEscapeHtml(window.aiBattleState.ai1.name)}:</strong> ${wbEscapeHtml(arg1)}
                <span style="color:#94a3b8;font-size:11px;">[المرجع: ${wbEscapeHtml(s1)}]</span>
            </div>
            <div>
                <strong style="color:#fbbf24;">🦾 ${wbEscapeHtml(window.aiBattleState.ai2.name)}:</strong> ${wbEscapeHtml(arg2)}
                <span style="color:#94a3b8;font-size:11px;">[المرجع: ${wbEscapeHtml(s2)}]</span>
            </div>
        `;
        feed.appendChild(card);
        feed.scrollTop = feed.scrollHeight;
    }

    window.updateAiFightersHud();
    const banner = document.getElementById('aiBattleAutoBanner');
    if (banner) {
        banner.classList.remove('hidden');
        if (r < total) {
            banner.textContent = `⏳ جاري الانتقال تلقائياً إلى الجولة ${r + 1}...`;
            window.aiBattleState.currentRound++;
            window.aiBattleStepTimerId = setTimeout(window.runNextAiDebateRound, 1400);
        } else {
            banner.textContent = '✅ اكتملت جميع الجولات! جاري توليد البحث/المصدر الموحّد...';
            window.aiBattleStepTimerId = setTimeout(window.finalizeAiDebateAndGenerateResearch, 900);
        }
    }
};

window.finalizeAiDebateAndGenerateResearch = function finalizeAiDebateAndGenerateResearch() {
    if (!window.aiBattleState) return;
    const { topic, ai1, ai2, roundRecords } = window.aiBattleState;
    const dateStr = new Date().toLocaleDateString('ar-DZ');
    const lines = [
        `📄 ورقة بحثية ومصدر موثّق ناتج عن معركة AI ضد AI`,
        `التاريخ: ${dateStr} | الخصم: ${ai2.name} (${ai2.opponentId || window.activeAiOpponentId})`,
        `الإشكالية البحثية: ${topic}`,
        ``,
        `أولاً — ملخص طرح (${ai1.name}):`,
        ...ai1.arguments.map(a => `• [جولة ${a.round}] ${a.claim} (المصدر: ${a.source})`),
        ``,
        `ثانياً — ملخص طرح (${ai2.name}):`,
        ...ai2.arguments.map(a => `• [جولة ${a.round}] ${a.claim} (المصدر: ${a.source})`),
        ``,
        `ثالثاً — التركيب التكاملي والنتيجة الموحّدة:`,
        `الجمع بين (${ai1.sources[0]}) و(${ai2.sources[0]}) يحقق توازناً عملياً بين سرعة الإنجاز وجودة المخرجات في "${topic}".`,
        ``,
        `المراجع المعتمدة في المناظرة:`,
        ...roundRecords.flatMap(rec => [`- ${rec.s1}`, `- ${rec.s2}`])
    ];

    window.generatedBattleResearchText = lines.join('\n');

    const resBox = document.getElementById('aiBattleResearchResult');
    if (resBox) {
        resBox.classList.remove('hidden');
        resBox.innerHTML = `
            <div class="generated-research-card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <h4 style="color:#34d399;margin:0;font-size:16px;">📚 البحث / المصدر المولّد من المعركة</h4>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button type="button" class="copy-mini-btn" onclick="copyTextToClipboard(window.generatedBattleResearchText, 'تم نسخ البحث المولّد 📋')">📋 نسخ البحث</button>
                        <button type="button" class="send-to-note-btn" onclick="sendGeneratedResearchToNote()">📝 إرسال إلى الملاحظات</button>
                        <button type="button" class="add-friend-btn" style="background:#10b981;" onclick="publishGeneratedResearchToCommunity()">🚀 نشر في مشاركة المشاريع</button>
                    </div>
                </div>
                <div class="research-pre-box">${wbEscapeHtml(window.generatedBattleResearchText)}</div>
            </div>
        `;
    }
};

window.sendGeneratedResearchToNote = function sendGeneratedResearchToNote() {
    if (!window.generatedBattleResearchText) return;
    wbAppendNote(window.generatedBattleResearchText, 'تم إرسال البحث المولّد إلى دفتر الملاحظات 📝');
};

window.publishGeneratedResearchToCommunity = function publishGeneratedResearchToCommunity() {
    if (!window.generatedBattleResearchText || !window.aiBattleState) return;
    const title = `بحث معركة AI (${window.activeAiOpponentId}): ${window.aiBattleState.topic.slice(0, 48)}`;
    const content = window.generatedBattleResearchText;

    if (typeof window.firebase !== 'undefined' && firebase.apps && firebase.apps.length && typeof firebase.database === 'function') {
        const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
        const authorId = String((u && u.id) || localStorage.getItem('ssp_ff_player_id') || '1001').replace(/^#/, '');
        const authorName = String((u && u.username) || document.getElementById('navUsername')?.textContent || 'طالب').trim();
        const newRef = firebase.database().ref('public/projects').push();
        newRef.set({
            id: newRef.key,
            title,
            domain: 'الذكاء الاصطناعي',
            content,
            authorId,
            authorName,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            wbToast('تم نشر البحث المولّد في مجتمع مشاركة المشاريع 🚀');
        }).catch(() => {
            wbToast('تعذر النشر السحابي حالياً', true);
        });
    } else if (Array.isArray(window.sharedProjects)) {
        const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
        window.sharedProjects.unshift({
            id: Date.now(),
            author: u ? u.username : 'طالب',
            authorId: u ? u.id : '#1001',
            title,
            domain: 'الذكاء الاصطناعي',
            content,
            likes: 1,
            dislikes: 0,
            userReactions: {},
            comments: []
        });
        if (typeof window.saveSharedProjects === 'function') window.saveSharedProjects(true);
        wbToast('تم نشر البحث المولّد في مجتمع مشاركة المشاريع 🚀');
    }
};

if (typeof window.openExternalBridgeModal !== 'function') {
    window.openExternalBridgeModal = function openExternalBridgeModal() {
        const modal = document.getElementById('externalBridgeModal') || document.getElementById('createBattleRoomModal');
        if (modal) {
            modal.classList.remove('hidden');
        } else {
            window.openCreateBattleRoomModal();
        }
    };
}

if (typeof window.sendLiveInviteToOpponent !== 'function') {
    window.sendLiveInviteToOpponent = function sendLiveInviteToOpponent(targetId) {
        const chosen = window.normalizeOpponentId(
            targetId || document.getElementById('aiOpponentIdInput')?.value || window.activeAiOpponentId
        );
        if (!chosen) {
            wbToast('أدخل ID الخصم أولاً', true);
            return;
        }
        if (typeof window.sendBattleInviteToId === 'function') {
            window.sendBattleInviteToId(chosen);
        } else {
            window.syncAiOpponentUi(chosen);
            wbToast(`تم تجهيز الدعوة للخصم ${chosen}`);
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    window.loadOpponentRefsRegistry();
    window.updateBattleRoomBanner();
    if (!window.battleTeamA.length || !window.battleTeamB.length) {
        window.setupBattleTeams();
    } else {
        window.renderBattleTeams();
    }
});

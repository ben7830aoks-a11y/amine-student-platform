        /* ==================== ساحة المعارك ==================== */
        function switchArenaMode(mode) {
            currentArenaSubMode = mode; const isClassic = mode === 'classic';
            document.getElementById('arenaTabClassic').classList.toggle('active-arena-tab', isClassic);
            document.getElementById('arenaTabAiVsAi').classList.toggle('active-arena-tab', !isClassic);
            document.getElementById('classicBattlePanel').classList.toggle('hidden', !isClassic);
            document.getElementById('aiVsAiBattlePanel').classList.toggle('hidden', isClassic);
            if (!isClassic) syncAiOpponentUi(activeAiOpponentId);
        }
        function updateRoundsFromBar() {
            const val = parseInt(document.getElementById('battleRoundsSelect')?.value || '3', 10) || 3;
            battleTotalRounds = val;
            const badge = document.getElementById('battleRoundsBadge');
            if (badge) badge.textContent = `${battleTotalRounds} جولات`;
        }
        function updateBattleRoomBanner() {
            const nameEl = document.getElementById('battleRoomNameDisplay'), codeEl = document.getElementById('battleRoomCodeBadge'), roundsEl = document.getElementById('battleRoundsBadge');
            if (nameEl) nameEl.textContent = battleRoomInfo.name; if (codeEl) codeEl.textContent = battleRoomInfo.code; if (roundsEl) roundsEl.textContent = `${battleTotalRounds} جولات`;
            const sel = document.getElementById('battleRoundsSelect'); if (sel) sel.value = String(battleTotalRounds);
        }
        function openCreateBattleRoomModal() {
            document.getElementById('newBattleRoomName').value = ''; document.getElementById('newBattleRoomMode').value = String(battleSize);
            document.getElementById('newBattleRoomRounds').value = String(battleTotalRounds); document.getElementById('newBattleRoomDomain').value = document.getElementById('battleDomainSelect')?.value || 'programming';
            document.getElementById('createBattleRoomModal').classList.remove('hidden');
        }
        function closeCreateBattleRoomModal() { document.getElementById('createBattleRoomModal').classList.add('hidden'); }
        function submitCreateBattleRoom() {
            const rawName = (document.getElementById('newBattleRoomName')?.value || '').trim(), modeVal = parseInt(document.getElementById('newBattleRoomMode')?.value || '1', 10) || 1, roundsVal = parseInt(document.getElementById('newBattleRoomRounds')?.value || '3', 10) || 3, domVal = document.getElementById('newBattleRoomDomain')?.value || 'programming';
            const code = `#ROOM-${Math.floor(100 + Math.random() * 900)}`;
            battleRoomInfo = { name: rawName || `غرفة التحدي ${code}`, code }; battleTotalRounds = roundsVal;
            const domSel = document.getElementById('battleDomainSelect'); if (domSel) domSel.value = domVal;
            updateBattleRoomBanner(); selectBattleSize(modeVal); closeCreateBattleRoomModal(); showToast(`تم إنشاء ${battleRoomInfo.name} (${code}) 🏠`);
        }
        function openAddCompetitorModal() { document.getElementById('competitorNameOrIdInput').value = ''; document.getElementById('competitorTargetTeam').value = 'B'; document.getElementById('competitorCapacityHint').textContent = `الوضع الحالي: ${battleSize} vs ${battleSize} (الحد الأقصى لكل فريق ${battleSize} لاعبين)`; document.getElementById('addCompetitorModal').classList.remove('hidden'); setTimeout(() => document.getElementById('competitorNameOrIdInput').focus(), 30); }
        function closeAddCompetitorModal() { document.getElementById('addCompetitorModal').classList.add('hidden'); }
        function submitAddCompetitor() {
            const raw = (document.getElementById('competitorNameOrIdInput')?.value || '').trim(), team = document.getElementById('competitorTargetTeam')?.value || 'B';
            if (!raw) { showToast('اكتب اسم المتنافس أو الـ ID أولاً', true); return; }
            const targetList = team === 'A' ? customTeamA : customTeamB;
            if (targetList.length >= battleSize) { showToast(`الفريق مكتمل في نمط ${battleSize} vs ${battleSize}! غيّر النمط أو احذف لاعباً أولاً`, true); return; }
            let name = raw, studentId = '#' + Math.floor(2000 + Math.random() * 7999);
            const idMatch = raw.match(/#\d{2,6}/);
            if (idMatch) { studentId = idMatch[0]; const cleanName = raw.replace(idMatch[0], '').trim(); name = cleanName || `طالب ${studentId}`; }
            else if (/^\d{3,6}$/.test(raw)) { studentId = '#' + raw; name = `طالب ${studentId}`; }
            targetList.push({ name, studentId, score: 0, isUser: false, isCustom: true }); closeAddCompetitorModal(); setupBattleTeams(); showToast(`تمت إضافة ${name} (${studentId}) إلى الفريق ${team === 'A' ? 'Alpha' : 'Omega'} ➕`);
        }
        function removeCustomCompetitor(team, idx) {
            if (team === 'A') customTeamA.splice(idx, 1); else customTeamB.splice(idx, 1);
            setupBattleTeams(); showToast('تمت إزالة المتنافس');
        }
        function selectBattleSize(size) {
            battleSize = size; document.querySelectorAll('.battle-mode-btn').forEach(b => b.classList.remove('active-mode'));
            const btn = document.getElementById(`modeBtn${size}v${size}`); if (btn) btn.classList.add('active-mode');
            document.getElementById('battleModeLabel').textContent = `${size} vs ${size}`;
            customTeamA = customTeamA.slice(0, size); customTeamB = customTeamB.slice(0, size); setupBattleTeams();
        }
        function setupBattleTeams() {
            const userName = currentUser ? currentUser.username : 'أنت', userId = currentUser ? currentUser.id : '#1001';
            const poolA = [{ name: userName, studentId: userId, isUser: true }, { name: 'سارة منصور', studentId: '#2045' }, { name: 'كريم بن علي', studentId: '#3109' }, { name: 'ليلى مراد', studentId: '#4412' }];
            const poolB = [{ name: 'منافس الساحة', studentId: '#5102' }, { name: 'ياسين قاسمي', studentId: '#6218' }, { name: 'نور الهدى', studentId: '#7319' }, { name: 'آدم كريم', studentId: '#8420' }];
            battleTeamA = []; battleTeamB = [];
            for (let i = 0; i < battleSize; i++) {
                if (customTeamA[i]) battleTeamA.push({ ...customTeamA[i], score: 0 }); else battleTeamA.push({ ...poolA[i], score: 0 });
                if (customTeamB[i]) battleTeamB.push({ ...customTeamB[i], score: 0 }); else battleTeamB.push({ ...poolB[i], score: 0 });
            }
            renderBattleTeams();
        }
        function renderBattleTeams() {
            const listA = document.getElementById('teamAPlayersList'), listB = document.getElementById('teamBPlayersList'); listA.innerHTML = ''; listB.innerHTML = '';
            let scoreA = 0, scoreB = 0;
            battleTeamA.forEach((p, idx) => {
                scoreA += p.score; const div = document.createElement('div'); div.className = 'player-slot';
                const canDel = !p.isUser && customTeamA.some(c => c.studentId === p.studentId);
                div.innerHTML = `<div><span>${p.isUser ? '👤 ' : '🎓 '}<strong>${escapeHtml(p.name)}</strong></span><span class="player-id-pill">${escapeHtml(p.studentId)}</span></div><div style="display:flex;align-items:center;gap:6px;"><strong style="color:#38bdf8;">${p.score} ن</strong>${canDel ? `<button type="button" onclick="removeCustomCompetitor('A', ${idx})" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-size:12px;">✕</button>` : ''}</div>`;
                listA.appendChild(div);
            });
            battleTeamB.forEach((p, idx) => {
                scoreB += p.score; const div = document.createElement('div'); div.className = 'player-slot';
                const canDel = customTeamB.some(c => c.studentId === p.studentId);
                div.innerHTML = `<div><span>🤖 <strong>${escapeHtml(p.name)}</strong></span><span class="player-id-pill">${escapeHtml(p.studentId)}</span></div><div style="display:flex;align-items:center;gap:6px;"><strong style="color:#fb7185;">${p.score} ن</strong>${canDel ? `<button type="button" onclick="removeCustomCompetitor('B', ${idx})" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-size:12px;">✕</button>` : ''}</div>`;
                listB.appendChild(div);
            });
            document.getElementById('teamAScoreBadge').textContent = `${scoreA} نقطة`; document.getElementById('teamBScoreBadge').textContent = `${scoreB} نقطة`;
        }
        function clearBattleTimers() { clearInterval(battleTimerId); clearInterval(autoAdvanceCountdownId); }
        function startNewBattle() {
            clearBattleTimers(); updateRoundsFromBar(); setupBattleTeams();
            const domain = document.getElementById('battleDomainSelect').value; let sourcePool = [];
            if (domain === 'programming') sourcePool = [...platformQuestionBank.programming];
            else if (domain === 'math') sourcePool = [...platformQuestionBank.math];
            else sourcePool = [...platformQuestionBank.programming, ...platformQuestionBank.math];
            sourcePool.sort(() => Math.random() - 0.5); battleQuestions = [];
            for (let i = 0; i < battleTotalRounds; i++) battleQuestions.push(sourcePool[i % sourcePool.length]);
            battleRoundIndex = 0; battleLogs = [];
            document.getElementById('battleSummaryArea').classList.add('hidden'); document.getElementById('battleActiveArea').classList.remove('hidden');
            loadBattleRound(); showToast(`بدأت المعركة (${battleTotalRounds} جولات) في ${battleRoomInfo.name} 🔥`);
        }
        function loadBattleRound() {
            clearBattleTimers(); battleAnswered = false; const qObj = battleQuestions[battleRoundIndex], letters = ['A', 'B', 'C', 'D'];
            document.getElementById('battleRoundInfo').textContent = `الجولة ${battleRoundIndex + 1} / ${battleTotalRounds} — ${qObj.domain}`;
            document.getElementById('battleQuestionText').textContent = qObj.q; document.getElementById('battleRoundFeedback').innerHTML = '';
            document.getElementById('autoNextRoundBanner').classList.add('hidden'); document.getElementById('cantAnswerBtn').disabled = false;
            const grid = document.getElementById('battleOptionsGrid'); grid.innerHTML = '';
            qObj.options.forEach((opt, idx) => { const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'battle-opt-btn'; btn.innerHTML = `<span class="opt-letter">${letters[idx]}</span><span>${escapeHtml(opt)}</span>`; btn.onclick = () => submitBattleChoice(idx); grid.appendChild(btn); });
            battleTimerSec = 20; document.getElementById('battleTimerBadge').textContent = `⏱️ ${battleTimerSec} ثانية`;
            battleTimerId = setInterval(() => { battleTimerSec--; document.getElementById('battleTimerBadge').textContent = `⏱️ ${battleTimerSec} ثانية`; if (battleTimerSec <= 0) { clearInterval(battleTimerId); if (!battleAnswered) handleRoundTimeout(); } }, 1000);
        }
        function lockBattleOptions() { document.querySelectorAll('#battleOptionsGrid .battle-opt-btn').forEach(b => b.disabled = true); document.getElementById('cantAnswerBtn').disabled = true; }
        function scheduleAutoAdvanceRound(isLastRound) {
            let secLeft = 3; const banner = document.getElementById('autoNextRoundBanner'); banner.classList.remove('hidden');
            banner.textContent = isLastRound ? `⏳ انتهت جميع الجولات... عرض التقرير النهائي خلال ${secLeft} ثوانٍ` : `⏳ الانتقال تلقائياً إلى الجولة التالية خلال ${secLeft} ثوانٍ...`;
            clearInterval(autoAdvanceCountdownId);
            autoAdvanceCountdownId = setInterval(() => { secLeft--; if (secLeft > 0) banner.textContent = isLastRound ? `⏳ عرض التقرير النهائي خلال ${secLeft} ثوانٍ...` : `⏳ الانتقال تلقائياً إلى الجولة التالية خلال ${secLeft} ثوانٍ...`; else { clearInterval(autoAdvanceCountdownId); if (isLastRound) finishBattle(); else { battleRoundIndex++; loadBattleRound(); } } }, 1000);
        }
        function submitBattleChoice(choiceIdx) {
            if (battleAnswered) return; battleAnswered = true; clearBattleTimers(); lockBattleOptions();
            const qObj = battleQuestions[battleRoundIndex], isCorrect = choiceIdx === qObj.answer, letters = ['A', 'B', 'C', 'D'], userPlayer = battleTeamA[0];
            let rivalSuccess = false;
            if (isCorrect) { userPlayer.score += 10; rivalSuccess = Math.random() < 0.35; if (rivalSuccess) battleTeamB[0].score += 10; document.getElementById('battleRoundFeedback').innerHTML = `<span style="color:#10b981;font-weight:bold;">✅ إجابة صحيحة! (+10 نقاط لفريق Alpha)</span>`; }
            else { rivalSuccess = Math.random() < 0.75; if (rivalSuccess) battleTeamB[0].score += 10; document.getElementById('battleRoundFeedback').innerHTML = `<span style="color:#f87171;font-weight:bold;">❌ إجابة خاطئة! الإجابة الصحيحة هي (${letters[qObj.answer]}): ${escapeHtml(qObj.options[qObj.answer])}</span>`; }
            battleLogs.push({ round: battleRoundIndex + 1, question: qObj.q, correctText: `(${letters[qObj.answer]}) ${qObj.options[qObj.answer]}`, userCorrect: isCorrect, cantAnswer: false, rivalSuccess });
            renderBattleTeams(); scheduleAutoAdvanceRound(battleRoundIndex >= battleTotalRounds - 1);
        }
        function declareCantAnswer() {
            if (battleAnswered) return; battleAnswered = true; clearBattleTimers(); lockBattleOptions();
            const qObj = battleQuestions[battleRoundIndex], letters = ['A', 'B', 'C', 'D']; battleTeamB[0].score += 10;
            document.getElementById('battleRoundFeedback').innerHTML = `<span style="color:#fbbf24;font-weight:bold;">🏳️ أعلنت عدم قدرتك على الإجابة. (+10 نقاط للفريق المنافس) — الإجابة الصحيحة: ${escapeHtml(qObj.options[qObj.answer])}</span>`;
            battleLogs.push({ round: battleRoundIndex + 1, question: qObj.q, correctText: `(${letters[qObj.answer]}) ${qObj.options[qObj.answer]}`, userCorrect: false, cantAnswer: true, rivalSuccess: true });
            renderBattleTeams(); scheduleAutoAdvanceRound(battleRoundIndex >= battleTotalRounds - 1);
        }
        function handleRoundTimeout() {
            if (battleAnswered) return; battleAnswered = true; lockBattleOptions();
            const qObj = battleQuestions[battleRoundIndex], letters = ['A', 'B', 'C', 'D']; battleTeamB[0].score += 10;
            document.getElementById('battleRoundFeedback').innerHTML = `<span style="color:#fbbf24;font-weight:bold;">⏰ انتهى الوقت! (+10 نقاط للفريق المنافس) — الإجابة الصحيحة: ${escapeHtml(qObj.options[qObj.answer])}</span>`;
            battleLogs.push({ round: battleRoundIndex + 1, question: qObj.q, correctText: `(${letters[qObj.answer]}) ${qObj.options[qObj.answer]}`, userCorrect: false, cantAnswer: false, rivalSuccess: true });
            renderBattleTeams(); scheduleAutoAdvanceRound(battleRoundIndex >= battleTotalRounds - 1);
        }
        function finishBattle() {
            clearBattleTimers(); document.getElementById('battleActiveArea').classList.add('hidden');
            const scoreA = battleTeamA.reduce((s, p) => s + p.score, 0), scoreB = battleTeamB.reduce((s, p) => s + p.score, 0), userWon = scoreA > scoreB, isDraw = scoreA === scoreB;
            let headline = '🤝 تعادل مثير!', headlineColor = '#fbbf24';
            if (userWon) { headline = '🏆 مبروك! فريق Alpha حسم المعركة!'; headlineColor = '#10b981'; } else { headline = '⚠️ خسارة فريق Alpha أمام الفريق المنافس'; headlineColor = '#f87171'; }
            const missedItems = battleLogs.filter(l => !l.userCorrect);
            let missedHtml = '';
            if (missedItems.length > 0) {
                missedHtml = `<div class="loser-highlight-card"><h4 style="color:#f87171;margin-bottom:8px;font-size:14px;">📌 الأسئلة التي لم تُجب عليها أو أخطأت فيها:</h4>${missedItems.map(m => `<div style="background:rgba(15,23,42,0.7);padding:10px;border-radius:8px;margin-bottom:8px;font-size:13px;"><div><strong>الجولة ${m.round}:</strong> ${escapeHtml(m.question)}</div><div style="color:#34d399;margin-top:4px;">✅ الإجابة الصحيحة: ${escapeHtml(m.correctText)}</div></div>`).join('')}</div>`;
            } else missedHtml = `<div class="card" style="background:rgba(16,185,129,0.12);border-color:#10b981;margin-top:12px;"><strong style="color:#34d399;">🌟 أداء مثالي! أجبت عن جميع الأسئلة بشكل صحيح.</strong></div>`;
            const summaryEl = document.getElementById('battleSummaryArea'); summaryEl.classList.remove('hidden');
            summaryEl.innerHTML = `<div class="card" style="border-color:${headlineColor};"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;"><h3 style="color:${headlineColor};font-size:19px;margin:0;">${headline}</h3><strong style="font-size:15px;">النتيجة: Alpha ${scoreA} — ${scoreB} Omega</strong></div>${missedHtml}<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;"><button type="button" class="btn" onclick="startNewBattle()" style="width:auto;background:#10b981;">🔄 معركة جديدة</button><button type="button" class="send-to-note-btn" onclick="saveBattleSummaryToNote()">📝 حفظ ملخص المعركة في الملاحظات</button></div></div>`;
        }
        function saveBattleSummaryToNote() {
            const scoreA = battleTeamA.reduce((s, p) => s + p.score, 0), scoreB = battleTeamB.reduce((s, p) => s + p.score, 0);
            const lines = [`⚔️ ملخص معركة (${battleRoomInfo.name} - ${battleSize}v${battleSize}): Alpha ${scoreA} - ${scoreB} Omega`];
            battleLogs.forEach(l => lines.push(`• الجولة ${l.round}: ${l.question} | الصحيح: ${l.correctText}`));
            appendToActiveNote(lines.join('\n'), 'تم حفظ ملخص المعركة في دفتر الملاحظات 📝');
        }

        /* ==================== معركة AI ضد AI حسب الـ ID ==================== */
        function getDefaultOpponentProfile(normId) {
            const presets = {
                '#3109': { id: '#3109', name: 'ياسين قاسمي', agentName: 'وكيل الخصم — ياسين قاسمي (#3109)', sources: 'المصدر 1: المعمارية المعيارية وقابلية التوسع تمنع إعادة البناء المكلفة.\nالمصدر 2: توثيق الواجهات والاختبارات الآلية يحافظ على استقرار المشروع عند نمو الفريق.' },
                '#2045': { id: '#2045', name: 'سارة منصور', agentName: 'وكيل الخصم — سارة منصور (#2045)', sources: 'المصدر 1: تجربة المستخدم الواضحة وتقليل خطوات التفاعل يرفعان كفاءة التعلّم.\nالمصدر 2: التغذية الراجعة الفورية تساعد الطالب على تصحيح المفاهيم فوراً.' },
                '#7312': { id: '#7312', name: 'سمير منصوري', agentName: 'وكيل الخصم — سمير منصوري (#7312)', sources: 'المصدر 1: الموازنة بين البساطة والمرونة تجعل المشروع قابلاً للتشغيل على مختلف الأجهزة.\nالمصدر 2: التحقق من المدخلات والأمان يحمي بيانات المستخدمين.' }
            };
            if (presets[normId]) return presets[normId];
            const num = normId.replace('#', '') || '0000';
            return { id: normId, name: `الخصم ${normId}`, agentName: `وكيل الخصم (${normId})`, sources: `المصدر 1 (${normId}): تحليل المشكلة من زاوية الكفاءة العملية وسهولة الصيانة.\nالمصدر 2 (${normId}): دعم القرارات التقنية بأمثلة قابلة للقياس والتحقق.` };
        }
        function loadOpponentRefsRegistry() { const saved = JSON.parse(localStorage.getItem('smartStudentOpponentRefs') || 'null'); opponentRefsRegistry = (saved && typeof saved === 'object') ? saved : {}; }
        function saveOpponentRefsRegistry() { localStorage.setItem('smartStudentOpponentRefs', JSON.stringify(opponentRefsRegistry)); }
        function normalizeOpponentId(raw) { const cleaned = String(raw || '').trim(); if (!cleaned) return ''; return cleaned.startsWith('#') ? cleaned : '#' + cleaned.replace(/^#/, ''); }
        function syncAiOpponentUi(rawId) {
            const normId = normalizeOpponentId(rawId) || '#3109'; activeAiOpponentId = normId;
            const profile = opponentRefsRegistry[normId] || getDefaultOpponentProfile(normId);
            const inpId = document.getElementById('aiOpponentIdInput'), badge = document.getElementById('aiOpponentLinkedBadge'), titleSpan = document.getElementById('aiOpponentDisplayTitle'), nameInp = document.getElementById('ai2NameInput'), srcInp = document.getElementById('ai2SourcesInput');
            if (inpId) inpId.value = normId; if (badge) badge.textContent = `الخصم المرتبط: ${profile.name} (${normId})`;
            if (titleSpan) titleSpan.textContent = `${profile.name} ${normId}`; if (nameInp) nameInp.value = profile.agentName || `وكيل الخصم — ${profile.name} (${normId})`; if (srcInp) srcInp.value = profile.sources || '';
        }
        function addAiOpponentById() {
            const raw = document.getElementById('aiOpponentIdInput')?.value || '', normId = normalizeOpponentId(raw);
            if (!normId) { showToast('أدخل ID الخصم أولاً (مثال: #2045)', true); return; }
            if (!opponentRefsRegistry[normId]) { opponentRefsRegistry[normId] = getDefaultOpponentProfile(normId); saveOpponentRefsRegistry(); }
            syncAiOpponentUi(normId); showToast(`تم ربط الخصم ${opponentRefsRegistry[normId].name} (${normId}) ومراجعه بنجاح 🆔`);
        }
        function saveOpponentIdRefs() {
            const normId = normalizeOpponentId(document.getElementById('aiOpponentIdInput')?.value || activeAiOpponentId) || '#3109', agentName = (document.getElementById('ai2NameInput')?.value || '').trim(), sources = (document.getElementById('ai2SourcesInput')?.value || '').trim();
            const existing = opponentRefsRegistry[normId] || getDefaultOpponentProfile(normId);
            opponentRefsRegistry[normId] = { ...existing, id: normId, agentName: agentName || existing.agentName, sources: sources || existing.sources };
            activeAiOpponentId = normId; saveOpponentRefsRegistry(); syncAiOpponentUi(normId); showToast(`تم حفظ مراجع الخصم ${normId} 💾`);
        }
        function loadCurrentNoteIntoAiSource(slot) {
            const note = notesList.find(n => n.id === activeNoteId) || notesList[0], text = (note && note.content ? note.content.trim() : '') || 'ملاحظة دراسية حول هيكلة المشروع وتحسين الأداء.';
            if (slot === 1) { document.getElementById('ai1SourcesInput').value = text.slice(0, 600); showToast('تم سحب محتوى ملاحظتك إلى وكيلك الأول 📥'); }
            else { document.getElementById('ai2SourcesInput').value = text.slice(0, 600); saveOpponentIdRefs(); }
        }
        function parseSourcesList(rawText) { const lines = String(rawText || '').split(/\n+/).map(l => l.trim()).filter(Boolean); return lines.length ? lines : ['مرجع عام داعم للحجة التحليلية.']; }
        function startAiVsAiBattle() {
            clearTimeout(aiBattleStepTimerId);
            const topic = (document.getElementById('aiBattleTopicInput')?.value || '').trim() || 'موضوع بحثي مقارن', rounds = parseInt(document.getElementById('aiBattleRoundsSelect')?.value || '3', 10) || 3;
            const ai1Name = (document.getElementById('ai1NameInput')?.value || 'AI-Alpha').trim(), ai2Name = (document.getElementById('ai2NameInput')?.value || `وكيل الخصم (${activeAiOpponentId})`).trim();
            const ai1Sources = parseSourcesList(document.getElementById('ai1SourcesInput')?.value), ai2Sources = parseSourcesList(document.getElementById('ai2SourcesInput')?.value);
            aiBattleState = { topic, totalRounds: rounds, currentRound: 1, ai1: { name: ai1Name, sources: ai1Sources, hp: 100, score: 0, arguments: [] }, ai2: { name: ai2Name, opponentId: activeAiOpponentId, sources: ai2Sources, hp: 100, score: 0, arguments: [] }, roundRecords: [] };
            updateAiFightersHud(); document.getElementById('aiBattleTurnsFeed').innerHTML = ''; document.getElementById('aiBattleResearchResult').classList.add('hidden');
            document.getElementById('aiBattleAutoBanner').classList.add('hidden'); document.getElementById('aiBattleLiveArea').classList.remove('hidden');
            runNextAiDebateRound();
        }
        function updateAiFightersHud() {
            if (!aiBattleState) return; const { ai1, ai2 } = aiBattleState;
            document.getElementById('ai1HpText').textContent = ai1.hp; document.getElementById('ai1ScoreText').textContent = ai1.score; document.getElementById('ai1HpBar').style.width = `${Math.max(0, ai1.hp)}%`;
            document.getElementById('ai2HpText').textContent = ai2.hp; document.getElementById('ai2ScoreText').textContent = ai2.score; document.getElementById('ai2HpBar').style.width = `${Math.max(0, ai2.hp)}%`;
        }
        function runNextAiDebateRound() {
            if (!aiBattleState) return; const r = aiBattleState.currentRound, total = aiBattleState.totalRounds;
            document.getElementById('aiBattleRoundBadge').textContent = `الجولة ${r} / ${total}`;
            const s1 = aiBattleState.ai1.sources[(r - 1) % aiBattleState.ai1.sources.length], s2 = aiBattleState.ai2.sources[(r - 1) % aiBattleState.ai2.sources.length];
            const arg1 = `وفق (${s1})، فإن تطبيق هذا المبدأ في "${aiBattleState.topic}" يعزز جودة التنفيذ ويقلل الأخطاء المبكرة.`, arg2 = `بالاستناد إلى (${s2})، فإن مراعاة هذا الجانب في "${aiBattleState.topic}" تضمن الاستدامة وتوازن المتطلبات العملية.`;
            const dmg1 = 14 + ((r * 5) % 10), dmg2 = 14 + (((r + 2) * 5) % 10);
            aiBattleState.ai1.score += 15; aiBattleState.ai2.score += 15; aiBattleState.ai1.hp = Math.max(15, aiBattleState.ai1.hp - dmg2); aiBattleState.ai2.hp = Math.max(15, aiBattleState.ai2.hp - dmg1);
            aiBattleState.ai1.arguments.push({ round: r, source: s1, claim: arg1 }); aiBattleState.ai2.arguments.push({ round: r, source: s2, claim: arg2 });
            aiBattleState.roundRecords.push({ round: r, s1, s2, arg1, arg2 });
            const feed = document.getElementById('aiBattleTurnsFeed'), card = document.createElement('div');
            card.className = 'debate-turn-box';
            card.innerHTML = `<div style="color:var(--accent);font-weight:bold;margin-bottom:6px;">⚔️ الجولة ${r}</div><div style="margin-bottom:8px;"><strong style="color:#38bdf8;">🤖 ${escapeHtml(aiBattleState.ai1.name)}:</strong> ${escapeHtml(arg1)} <span style="color:#94a3b8;font-size:11px;">[المرجع: ${escapeHtml(s1)}]</span></div><div><strong style="color:#fbbf24;">🦾 ${escapeHtml(aiBattleState.ai2.name)}:</strong> ${escapeHtml(arg2)} <span style="color:#94a3b8;font-size:11px;">[المرجع: ${escapeHtml(s2)}]</span></div>`;
            feed.appendChild(card); feed.scrollTop = feed.scrollHeight; updateAiFightersHud();
            const banner = document.getElementById('aiBattleAutoBanner'); banner.classList.remove('hidden');
            if (r < total) { banner.textContent = `⏳ جاري الانتقال تلقائياً إلى الجولة ${r + 1}...`; aiBattleState.currentRound++; aiBattleStepTimerId = setTimeout(runNextAiDebateRound, 1400); }
            else { banner.textContent = '✅ اكتملت جميع الجولات! جاري توليد البحث/المصدر الموحّد...'; aiBattleStepTimerId = setTimeout(finalizeAiDebateAndGenerateResearch, 900); }
        }
        function finalizeAiDebateAndGenerateResearch() {
            if (!aiBattleState) return; const { topic, ai1, ai2, roundRecords } = aiBattleState, dateStr = new Date().toLocaleDateString('ar-DZ');
            const lines = [`📄 ورقة بحثية ومصدر موثّق ناتج عن معركة AI ضد AI`, `التاريخ: ${dateStr} | الخصم: ${ai2.name} (${ai2.opponentId || activeAiOpponentId})`, `الإشكالية البحثية: ${topic}`, ``, `أولاً — ملخص طرح (${ai1.name}):`, ...ai1.arguments.map(a => `• [جولة ${a.round}] ${a.claim} (المصدر: ${a.source})`), ``, `ثانياً — ملخص طرح (${ai2.name}):`, ...ai2.arguments.map(a => `• [جولة ${a.round}] ${a.claim} (المصدر: ${a.source})`), ``, `ثالثاً — التركيب التكاملي والنتيجة الموحّدة:`, `الجمع بين (${ai1.sources[0]}) و(${ai2.sources[0]}) يحقق توازناً عملياً بين سرعة الإنجاز وجودة المخرجات في "${topic}".`, ``, `المراجع المعتمدة في المناظرة:`, ...roundRecords.flatMap(rec => [`- ${rec.s1}`, `- ${rec.s2}`])];
            generatedBattleResearchText = lines.join('\n');
            const resBox = document.getElementById('aiBattleResearchResult'); resBox.classList.remove('hidden');
            resBox.innerHTML = `<div class="generated-research-card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"><h4 style="color:#34d399;margin:0;font-size:16px;">📚 البحث / المصدر المولّد من المعركة</h4><div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="copy-mini-btn" onclick="copyTextToClipboard(generatedBattleResearchText, 'تم نسخ البحث المولّد 📋')">📋 نسخ البحث</button><button type="button" class="send-to-note-btn" onclick="sendGeneratedResearchToNote()">📝 إرسال إلى الملاحظات</button><button type="button" class="add-friend-btn" style="background:#10b981;" onclick="publishGeneratedResearchToCommunity()">🚀 نشر في مشاركة المشاريع</button></div></div><div class="research-pre-box">${escapeHtml(generatedBattleResearchText)}</div></div>`;
        }
        function sendGeneratedResearchToNote() { if (!generatedBattleResearchText) return; appendToActiveNote(generatedBattleResearchText, 'تم إرسال البحث المولّد إلى دفتر الملاحظات 📝'); }
        function publishGeneratedResearchToCommunity() {
            if (!generatedBattleResearchText || !aiBattleState) return;
            sharedProjects.unshift({ id: Date.now(), author: currentUser ? currentUser.username : 'طالب', authorId: currentUser ? currentUser.id : '#1001', title: `بحث معركة AI (${activeAiOpponentId}): ${aiBattleState.topic.slice(0, 48)}`, domain: 'الذكاء الاصطناعي', content: generatedBattleResearchText, likes: 1, dislikes: 0, userReactions: {}, comments: [] });
            saveSharedProjects(true); showToast('تم نشر البحث المولّد في مجتمع مشاركة المشاريع 🚀');
        }

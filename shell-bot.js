        /* ==================== الروبوت الذكي العائم المراقب ==================== */
        function clampBotIntoViewport() {
            const wrapper = document.getElementById('floatingBotWrapper');
            if (!wrapper || wrapper.classList.contains('hidden') || !wrapper.style.left || wrapper.style.left === 'auto') return;
            const l = parseFloat(wrapper.style.left), t = parseFloat(wrapper.style.top);
            if (Number.isNaN(l) || Number.isNaN(t)) return;
            wrapper.style.left = Math.min(Math.max(8, window.innerWidth - wrapper.offsetWidth - 8), Math.max(8, l)) + 'px';
            wrapper.style.top = Math.min(Math.max(8, window.innerHeight - wrapper.offsetHeight - 8), Math.max(8, t)) + 'px';
        }
        function applyBotVisibilityState() { const w = document.getElementById('floatingBotWrapper'), b = document.getElementById('botVisibilityNavBtn'); if (w) w.classList.toggle('hidden', botHiddenCompletely); if (b) b.textContent = botHiddenCompletely ? '🤖 إظهار الروبوت' : '🤖 إخفاء الروبوت'; }
        function toggleBotVisibility() { botHiddenCompletely = !botHiddenCompletely; localStorage.setItem('smartStudentBotHidden', botHiddenCompletely ? '1' : '0'); if (botHiddenCompletely) toggleBotDrawer(false); applyBotVisibilityState(); if (!botHiddenCompletely) clampBotIntoViewport(); }
        function toggleBotQuietMode() { botQuietMode = !botQuietMode; localStorage.setItem('smartStudentBotQuiet', botQuietMode ? '1' : '0'); applyBotQuietVisual(); }
        function applyBotQuietVisual() { const b = document.getElementById('botSpeechBubble'), q = document.getElementById('botQuietToggleBtn'); if (b) b.classList.toggle('hidden', botQuietMode); if (q) q.textContent = botQuietMode ? '👁️' : '🔇'; }
        function initFloatingBotWatcher() {
            const wrapper = document.getElementById('floatingBotWrapper'), fab = document.getElementById('botFabBtn');
            if (!wrapper || !fab || fab.dataset.botInit) return; fab.dataset.botInit = 'true';
            botQuietMode = localStorage.getItem('smartStudentBotQuiet') === '1'; botHiddenCompletely = localStorage.getItem('smartStudentBotHidden') === '1';
            applyBotQuietVisual(); applyBotVisibilityState();
            const savedPos = JSON.parse(localStorage.getItem('smartStudentBotPos') || 'null');
            if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
                wrapper.style.left = Math.min(Math.max(8, window.innerWidth - 80), Math.max(8, savedPos.left)) + 'px';
                wrapper.style.top = Math.min(Math.max(8, window.innerHeight - 80), Math.max(8, savedPos.top)) + 'px';
                wrapper.style.bottom = 'auto'; wrapper.style.right = 'auto';
            }
            window.addEventListener('resize', clampBotIntoViewport);
            document.addEventListener('mousemove', function(e) {
                const le = document.getElementById('botEyeLeft'), re = document.getElementById('botEyeRight'); if (!le || !re) return;
                const r = fab.getBoundingClientRect(), ang = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)), dist = Math.min(2.6, Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) / 140), t = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px)`;
                le.style.transform = t; re.style.transform = t;
            });
            let dragInfo = null;
            fab.addEventListener('pointerdown', function(e) { if (e.button !== 0 && e.pointerType === 'mouse') return; const r = wrapper.getBoundingClientRect(); dragInfo = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origLeft: r.left, origTop: r.top, moved: false }; fab.setPointerCapture(e.pointerId); });
            fab.addEventListener('pointermove', function(e) { if (!dragInfo || dragInfo.pointerId !== e.pointerId) return; const dx = e.clientX - dragInfo.startX, dy = e.clientY - dragInfo.startY; if (Math.hypot(dx, dy) > 6) dragInfo.moved = true; if (!dragInfo.moved) return; wrapper.style.left = Math.min(Math.max(8, window.innerWidth - wrapper.offsetWidth - 8), Math.max(8, dragInfo.origLeft + dx)) + 'px'; wrapper.style.top = Math.min(Math.max(8, window.innerHeight - wrapper.offsetHeight - 8), Math.max(8, dragInfo.origTop + dy)) + 'px'; wrapper.style.bottom = 'auto'; wrapper.style.right = 'auto'; });
            const finishDrag = function(e) { if (!dragInfo || dragInfo.pointerId !== e.pointerId) return; try { if (fab.hasPointerCapture(e.pointerId)) fab.releasePointerCapture(e.pointerId); } catch (err) {} if (dragInfo.moved) { const r = wrapper.getBoundingClientRect(); localStorage.setItem('smartStudentBotPos', JSON.stringify({ left: Math.round(r.left), top: Math.round(r.top) })); } else toggleBotDrawer(); dragInfo = null; };
            fab.addEventListener('pointerup', finishDrag); fab.addEventListener('pointercancel', finishDrag);
            const mc = document.getElementById('botMiniChat'); if (mc && mc.children.length === 0) appendBotMiniMsg('روبوت المراقبة 🤖', 'أهلاً! أتابع نافذتك وأساعدك.', false);
            refreshBotLiveObservation('جاهز');
        }
        function getCurrentLiveContextSummary() {
            if (activeSectionId === 'projects' && activeSubTabId === 'notes') { const title = document.getElementById('activeNoteTitle')?.value.trim() || 'بدون عنوان'; return { windowName: '📝 دفتر الملاحظات', mood: '✍️', shortBubble: `أراقب "${title}"`, detail: `الملاحظة: "${title}"` }; }
            return { windowName: 'منصة الطالب الذكية', mood: '👁️', shortBubble: 'أراقب نافذتك...', detail: `القسم: ${activeSectionId}` };
        }
        function refreshBotLiveObservation(actionLabel = '') { const ctx = getCurrentLiveContextSummary(), b = document.getElementById('botSpeechBubble'), m = document.getElementById('botMoodTag'), cb = document.getElementById('botLiveContextBox'); if (m) m.textContent = ctx.mood; if (b) b.textContent = actionLabel ? `${ctx.shortBubble} (${actionLabel})` : ctx.shortBubble; if (cb) cb.innerHTML = `<strong style="color:var(--accent);">ما أراه الآن:</strong><br>${escapeHtml(ctx.detail)}`; }
        function notifyWatcherActivity() { refreshBotLiveObservation('تحديث'); }
        function toggleBotDrawer(forceState = null) { const d = document.getElementById('botInspectorDrawer'); if (!d) return; const open = forceState !== null ? forceState : d.classList.contains('hidden'); d.classList.toggle('hidden', !open); if (open) { refreshBotLiveObservation(); clampBotIntoViewport(); } }
        function appendBotMiniMsg(sender, text, isUser) { const box = document.getElementById('botMiniChat'); if (!box) return; const div = document.createElement('div'); div.style.padding = '7px 10px'; div.style.borderRadius = '8px'; div.style.fontSize = '12px'; div.style.whiteSpace = 'pre-wrap'; div.style.background = isUser ? 'var(--primary)' : 'var(--card-bg)'; div.style.color = isUser ? '#fff' : '#e2e8f0'; div.innerHTML = `<strong style="font-size:10px;opacity:0.85;">${escapeHtml(sender)}:</strong><br>${escapeHtml(text)}`; box.appendChild(div); box.scrollTop = box.scrollHeight; }
        function analyzeCurrentActivityWithBot() { const ctx = getCurrentLiveContextSummary(); lastBotInsight = `[${ctx.windowName}] ${ctx.detail}`; appendBotMiniMsg('روبوت المراقبة 🤖', ctx.detail, false); }
        function sendBotMiniPrompt() { const inp = document.getElementById('botMiniInput'), text = inp.value.trim(); if (!text) return; appendBotMiniMsg(currentUser ? currentUser.username : 'أنت', text, true); inp.value = ''; const reply = generateSmartAiResponse(text); lastBotInsight = reply; setTimeout(() => appendBotMiniMsg('روبوت المراقبة 🤖', reply, false), 250); }
        function sendBotInsightToNote() { if (!lastBotInsight) analyzeCurrentActivityWithBot(); appendToActiveNote(`🤖 ملاحظة الروبوت:\n${lastBotInsight}`); }

        /* ==================== التنقل ولوحة الأوامر ==================== */
        const navBtnMap = { projects: 'navProjects', battleArena: 'navBattleArena', sharing: 'navSharing', studyRoom: 'navStudyRoom', aiAssistant: 'navAiAssistant' };
        const subTabBtnMap = { calcGraph: 'subBtnCalc', notes: 'subBtnNotes', workshop: 'subBtnWorkshop', img2vid: 'subBtnImg2Vid' };
        function saveNavigationState() { localStorage.setItem('smartStudentNavState', JSON.stringify({ section: activeSectionId, subTab: activeSubTabId })); }
        function restoreLastNavigation() {
            const s = JSON.parse(localStorage.getItem('smartStudentNavState') || 'null'); if (!s || !s.section) return;
            showMainSection(s.section, document.getElementById(navBtnMap[s.section]));
            if (s.section === 'projects' && subTabBtnMap[s.subTab]) showSubTab(s.subTab, document.getElementById(subTabBtnMap[s.subTab]));
        }
        function updateMobileNavActive() {
            document.querySelectorAll('#mobileBottomNav .mobile-nav-item').forEach(item => {
                const k = item.getAttribute('data-mnav');
                item.classList.toggle('active', activeSectionId === 'projects' ? ((activeSubTabId === 'notes' && k === 'notes') || (activeSubTabId !== 'notes' && k === 'projects')) : (k === activeSectionId));
            });
        }
        function jumpToSection(sectionId, subTabId = null) { showMainSection(sectionId, document.getElementById(navBtnMap[sectionId])); if (sectionId === 'projects' && subTabId && subTabBtnMap[subTabId]) showSubTab(subTabId, document.getElementById(subTabBtnMap[subTabId])); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        function showMainSection(sectionId, btnEl) {
            activeSectionId = sectionId; document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden')); document.getElementById('section-' + sectionId).classList.remove('hidden');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); if (btnEl) btnEl.classList.add('active');
            if (sectionId === 'sharing') { syncSharedProjectsWithFreeDb(false); renderSharedProjects(); }
            if (sectionId === 'studyRoom') renderStudyRoomMembers();
            if (sectionId === 'battleArena') { setupBattleTeams(); syncAiOpponentUi(activeAiOpponentId); }
            if (sectionId === 'aiAssistant') updateAiLibrariesBadge();
            if (sectionId === 'projects' && activeSubTabId === 'calcGraph' && mathChartInstance) setTimeout(() => mathChartInstance.resize(), 40);
            if (sectionId === 'projects' && activeSubTabId === 'notes') { updateNotePageSizeLabel(); if (noteViewMode === 'preview') renderFormattedNotePreview(); }
            updateMobileNavActive(); saveNavigationState(); refreshBotLiveObservation('فتح القسم');
        }
        function showSubTab(tabId, btnEl) {
            activeSubTabId = tabId; document.querySelectorAll('.subtab-content').forEach(t => t.classList.add('hidden')); document.getElementById('subtab-' + tabId).classList.remove('hidden');
            document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active-sub')); if (btnEl) btnEl.classList.add('active-sub');
            if (tabId === 'calcGraph' && mathChartInstance) setTimeout(() => mathChartInstance.resize(), 40); if (tabId === 'notes') { updateNotePageSizeLabel(); if (noteViewMode === 'preview') renderFormattedNotePreview(); }
            updateMobileNavActive(); saveNavigationState(); refreshBotLiveObservation('تغيير التبويب');
        }

        const commandActions = [
            { title: '📲 تثبيت التطبيق على الجهاز', tag: 'PWA', keywords: 'تثبيت تحميل تطبيق هاتف', run: () => triggerPwaInstall() },
            { title: '🔢 الآلة الحاسبة والرسوم البيانية', tag: 'بناء مشاريع', keywords: 'الة حاسبة معدل منحنى', run: () => jumpToSection('projects', 'calcGraph') },
            { title: '📝 دفتر الملاحظات الذكي', tag: 'بناء مشاريع', keywords: 'ملاحظات ترجمة', run: () => jumpToSection('projects', 'notes') },
            { title: '🛠️ ورشة المهام اليومية', tag: 'بناء مشاريع', keywords: 'مهام بومودورو', run: () => jumpToSection('projects', 'workshop') },
            { title: '⚔️ ساحة المعارك', tag: 'قسم رئيسي', keywords: 'معركة battle', run: () => { jumpToSection('battleArena'); switchArenaMode('classic'); } },
            { title: '🧠 معركة AI ضد AI', tag: 'إجراء سريع', keywords: 'ذكاء اصطناعي ai', run: () => { jumpToSection('battleArena'); switchArenaMode('aiVsAi'); } },
            { title: '🌐 جسر دعوة وربط ID (مجاني)', tag: 'مشاركة', keywords: 'دعوة رابط id مجاني', run: () => openExternalBridgeModal() },
            { title: '🛡️ الخصوصية والقفل التلقائي', tag: 'أمان', keywords: 'خصوصية قفل تلقائي', run: () => openPrivacySecurityModal() },
            { title: '💾 نسخة احتياطية JSON', tag: 'أداة', keywords: 'نسخة احتياطية', run: () => openBackupModal() }
        ];
        function openCommandPalette() { const m = document.getElementById('commandPaletteModal'), i = document.getElementById('cmdSearchInput'); cmdSelectedIndex = 0; i.value = ''; m.classList.remove('hidden'); renderCommandList(); setTimeout(() => i.focus(), 30); }
        function closeCommandPalette() { document.getElementById('commandPaletteModal').classList.add('hidden'); }
        function getFilteredCommands() { const q = (document.getElementById('cmdSearchInput')?.value || '').trim().toLowerCase(); return !q ? commandActions : commandActions.filter(x => x.title.toLowerCase().includes(q) || x.keywords.toLowerCase().includes(q)); }
        function renderCommandList() {
            const listEl = document.getElementById('cmdResultsList'), items = getFilteredCommands();
            if (cmdSelectedIndex >= items.length) cmdSelectedIndex = 0; listEl.innerHTML = '';
            items.forEach((item, idx) => {
                const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cmd-item-btn' + (idx === cmdSelectedIndex ? ' selected' : '');
                btn.innerHTML = `<span>${escapeHtml(item.title)}</span><span class="cmd-item-tag">${escapeHtml(item.tag)}</span>`;
                btn.onclick = () => { closeCommandPalette(); item.run(); }; listEl.appendChild(btn);
            });
        }
        function handleCommandKeyDown(e) {
            const items = getFilteredCommands();
            if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { cmdSelectedIndex = (cmdSelectedIndex + 1) % items.length; renderCommandList(); } }
            else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { cmdSelectedIndex = (cmdSelectedIndex - 1 + items.length) % items.length; renderCommandList(); } }
            else if (e.key === 'Enter') { e.preventDefault(); if (items[cmdSelectedIndex]) { const a = items[cmdSelectedIndex]; closeCommandPalette(); a.run(); } }
            else if (e.key === 'Escape') closeCommandPalette();
        }
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                if (!document.getElementById('appScreen').classList.contains('hidden') && !screenLocked) {
                    e.preventDefault(); const o = !document.getElementById('commandPaletteModal').classList.contains('hidden');
                    if (o) closeCommandPalette(); else openCommandPalette();
                }
            }
            if (e.key === 'Escape') {
                if (typeof isWordFullscreen !== 'undefined' && isWordFullscreen) { toggleWordFullscreen(false); }
                closeCommandPalette(); closeCreateBattleRoomModal(); closeAddCompetitorModal(); closeAddFriendModal();
                closeShareModal(); closeBackupModal(); closeGuideModal(); closePrivacySecurityModal();
                closeExternalBridgeModal(); toggleBotDrawer(false);
                const tm = document.getElementById('noteTranslateMenu'); if (tm) tm.style.display = 'none';
            }
        });

        /* ==================== إرسال للملاحظة ==================== */
        function appendToActiveNote(textToAppend, successMessage) {
            if (!notesList || !notesList.length) initNotes();
            let note = notesList.find(n => n.id === activeNoteId) || notesList[0];
            activeNoteId = note.id;
            const currentPlain = getEditorPlainText();
            const updatedPlain = currentPlain ? `${currentPlain}\n\n${textToAppend}` : textToAppend;
            const safeHtmlLine = `<p>${escapeHtml(textToAppend).replace(/\n/g, '<br>')}</p>`;
            note.htmlContent = (note.htmlContent && note.htmlContent.trim()) ? `${note.htmlContent}${safeHtmlLine}` : safeHtmlLine;
            note.content = updatedPlain;
            saveNotesToStorage();
            loadNoteIntoEditor(note);
            renderNotesSidebar();
            showToast(successMessage || 'تم إرسال النص إلى ملاحظتك بنجاح 📝');
        }
        function sendCalcToNote() { const val = document.getElementById('calcScreen').value.trim(); if (!val) { showToast('لا توجد نتيجة لإرسالها', true); return; } appendToActiveNote(`🔢 نتيجة الآلة الحاسبة: ${val}`, 'تم إرسال النتيجة إلى ملاحظتك 📝'); }
        function sendGpaToNote() { const txt = document.getElementById('gpaResult').textContent.trim(), details = gpaItems.map(i => `• ${i.subject}: ${i.grade}/20 (معامل ${i.coeff})`).join('\n'); appendToActiveNote(`🎓 ${txt}${details ? '\n' + details : ''}`, 'تم إرسال المعدل إلى ملاحظتك 📝'); }
        function sendFunctionToNote() { const expr = document.getElementById('funcInput').value.trim(); if (!expr) { showToast('أدخل دالة أولاً', true); return; } appendToActiveNote(`📈 دالة رياضية: f(x) = ${expr}`, 'تم إرسال الدالة إلى ملاحظتك 📝'); }

        /* ==================== تهيئة عامة ==================== */
        function initWorkspaceData() {
            gpaItems = []; renderGpaList(); initNotes(); initTasks(); initSharedProjects(); initStudyRoom(); initAiAssistant();
            loadOpponentRefsRegistry(); syncAiOpponentUi(activeAiOpponentId); updateBattleRoomBanner(); setupBattleTeams();
        }
        function escapeHtml(text) { if (!text) return ''; return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

        window.addEventListener('DOMContentLoaded', () => {
            initDynamicPwaManifest();
            const savedUser = JSON.parse(localStorage.getItem('smartStudentUser') || 'null');
            if (savedUser && savedUser.email) { currentUser = savedUser; enterApp(); }
            else { toggleAuthMode('login'); }
        });

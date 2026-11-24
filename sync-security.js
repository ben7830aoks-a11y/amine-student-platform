        /* ==================== الربط المجاني بالـ ID والدعوات والمشاريع ==================== */
        function cleanDbBaseUrl(raw) {
            return String(raw || '').trim().replace(/\/+$/, '');
        }

        function sanitizeDbKey(rawId) {
            return String(rawId || '').trim().replace(/^#/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        }

        function extractUidFromFirebaseToken(token) {
            try {
                const parts = String(token || '').split('.');
                if (parts.length !== 3) return '';
                const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
                const payload = JSON.parse(atob(padded));
                return String(payload.user_id || payload.sub || '').trim();
            } catch (e) {
                return '';
            }
        }

        function buildDbEndpoint(path) {
            const cleanPath = String(path || '').replace(/^\/+/, '');
            const authQuery = firebaseAuthToken ? `?auth=${encodeURIComponent(firebaseAuthToken)}` : '';
            return `${freeDbUrl}/${cleanPath}.json${authQuery}`;
        }

        function getEffectiveUid() {
            const tokenUid = extractUidFromFirebaseToken(firebaseAuthToken);
            if (tokenUid) return tokenUid;
            if (firebaseAuthUid) return sanitizeDbKey(firebaseAuthUid);
            return sanitizeDbKey(currentUser ? currentUser.id : 'guest');
        }

        function normalizeProjectsCollection(rawData) {
            const list = Array.isArray(rawData)
                ? rawData
                : (rawData && typeof rawData === 'object' ? Object.values(rawData) : []);

            return list
                .filter(p => p && typeof p === 'object' && p.title && p.content)
                .map(p => ({
                    ...p,
                    likes: Number(p.likes || 0),
                    dislikes: Number(p.dislikes || 0),
                    userReactions: (p.userReactions && typeof p.userReactions === 'object') ? p.userReactions : {},
                    comments: Array.isArray(p.comments)
                        ? p.comments
                        : (p.comments && typeof p.comments === 'object' ? Object.values(p.comments) : [])
                }))
                .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        }

        function connectFreeRealtimeDb() {
            const url = cleanDbBaseUrl(document.getElementById('freeDbUrlInput')?.value || '');
            const rawUid = (document.getElementById('firebaseUidInput')?.value || '').trim();
            const token = (document.getElementById('firebaseTokenInput')?.value || '').trim();

            if (!url.startsWith('https://')) {
                showToast('أدخل رابط قاعدة بيانات يبدأ بـ https://', true);
                return;
            }
            if (!token) {
                showToast('أدخل رمز مصادقة Firebase Auth ID Token لتطبيق قواعد الأمان', true);
                return;
            }

            const tokenUid = extractUidFromFirebaseToken(token);
            const finalUid = tokenUid || rawUid;
            if (!finalUid) {
                showToast('أدخل UID المستخدم أو رمز مصادقة صالح', true);
                return;
            }

            freeDbUrl = url;
            firebaseAuthToken = token;
            firebaseAuthUid = finalUid;

            const uidInputEl = document.getElementById('firebaseUidInput');
            if (uidInputEl) uidInputEl.value = finalUid;

            localStorage.setItem('smartStudentFreeDbUrl', freeDbUrl);
            localStorage.setItem('smartStudentFirebaseUid', firebaseAuthUid);
            sessionStorage.setItem('smartStudentFirebaseToken', firebaseAuthToken);

            updateFreeDbStatusUi(`الحالة: متصل بقاعدة البيانات مع مصادقة (${firebaseAuthUid}) ✅`);
            publishMyProfileToFreeDb();
            syncSharedProjectsWithFreeDb(true);
            startInvitePolling();
            startProjectsPolling();
            showToast('تم تفعيل الربط الآمن والمزامنة 🌐');
        }

        function updateFreeDbStatusUi(msg) {
            const el = document.getElementById('freeDbStatusText');
            if (el) el.textContent = msg;
        }

        async function publishMyProfileToFreeDb() {
            if (!freeDbUrl || !firebaseAuthToken || !currentUser || !currentUser.id) return;
            const uid = getEffectiveUid();
            try {
                const res = await fetch(buildDbEndpoint(`users/${uid}`), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: String(currentUser.id).slice(0, 50),
                        username: String(currentUser.username || 'طالب').slice(0, 100),
                        roomCode: String(battleRoomInfo.code || '#ROOM-101').slice(0, 60),
                        online: true,
                        updatedAt: Date.now()
                    })
                });
                if (!res.ok) throw new Error('AUTH_REJECTED');
            } catch (e) {
                updateFreeDbStatusUi('تعذر التحديث على الخادم (تحقق من صلاحية Token أو القواعد)');
            }
        }

        async function syncSharedProjectsWithFreeDb(pushLocalFirst = false) {
            if (!freeDbUrl || !firebaseAuthToken) return;
            const roomKey = sanitizeDbKey(battleRoomInfo.code || 'ROOM-101');
            try {
                if (pushLocalFirst && Array.isArray(sharedProjects) && sharedProjects.length) {
                    const projectsMap = {};
                    sharedProjects.forEach((p, idx) => {
                        const key = `proj_${sanitizeDbKey(p.id || idx + 1)}`;
                        projectsMap[key] = {
                            id: p.id || Date.now() + idx,
                            author: String(p.author || 'طالب').slice(0, 100),
                            authorId: String(p.authorId || '#1001').slice(0, 50),
                            title: String(p.title || 'مشروع').slice(0, 200),
                            domain: String(p.domain || 'أخرى').slice(0, 100),
                            content: String(p.content || '').slice(0, 50000),
                            likes: Math.max(0, Number(p.likes || 0)),
                            dislikes: Math.max(0, Number(p.dislikes || 0)),
                            userReactions: (p.userReactions && typeof p.userReactions === 'object') ? p.userReactions : {},
                            comments: Array.isArray(p.comments) ? p.comments : []
                        };
                    });

                    const res = await fetch(buildDbEndpoint(`rooms/${roomKey}`), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: String(battleRoomInfo.name || 'غرفة المشاريع').slice(0, 150),
                            updatedAt: Date.now(),
                            projects: projectsMap
                        })
                    });
                    if (!res.ok) throw new Error('WRITE_DENIED');
                    return;
                }

                const res = await fetch(buildDbEndpoint(`rooms/${roomKey}/projects`));
                if (!res.ok) return;
                const remoteData = await res.json();
                const normalized = normalizeProjectsCollection(remoteData);
                if (normalized.length) {
                    sharedProjects = normalized;
                    saveSharedProjects(false);
                    if (activeSectionId === 'sharing') renderSharedProjects();
                }
            } catch (e) {}
        }

        function startProjectsPolling() {
            clearInterval(projectsPollTimerId);
            if (!freeDbUrl || !firebaseAuthToken) return;
            projectsPollTimerId = setInterval(() => syncSharedProjectsWithFreeDb(false), 6000);
        }

        async function lookupRegisteredUserById() {
            const raw = (document.getElementById('friendNameOrIdInput')?.value || '').trim();
            const box = document.getElementById('lookupUserResultBox');
            if (!raw) {
                showToast('أدخل ID المستخدم للبحث عنه', true);
                return null;
            }
            const normId = raw.startsWith('#') ? raw : '#' + raw.replace(/^#/, '');
            const localMatch = getRegisteredAccounts().find(
                a => a.id === normId || a.username.toLowerCase() === raw.toLowerCase()
            );
            if (localMatch) {
                if (box) {
                    box.innerHTML = `<span style="color:#34d399;">✅ وُجد: <strong>${escapeHtml(localMatch.username)}</strong> (${escapeHtml(localMatch.id)})</span>`;
                }
                return localMatch;
            }

            if (freeDbUrl && firebaseAuthToken) {
                try {
                    const res = await fetch(buildDbEndpoint(`users/${sanitizeDbKey(normId)}`));
                    const data = await res.json();
                    if (data && data.id) {
                        if (box) {
                            box.innerHTML = `<span style="color:#34d399;">✅ مستخدم مسجل: <strong>${escapeHtml(data.username)}</strong> (${escapeHtml(data.id)})</span>`;
                        }
                        return data;
                    }
                } catch (e) {
                    if (box) {
                        box.innerHTML = `<span style="color:#fbbf24;">تعذر البحث عن الـ ID الآن؛ تحقق من الاتصال أو الصلاحيات.</span>`;
                    }
                    return null;
                }
            }

            if (box) {
                box.innerHTML = `<span style="color:#fbbf24;">ℹ️ لم يُعثر على حساب بهذا الـ ID؛ يمكنك إضافته يدوياً أو إرسال رابط الدعوة.</span>`;
            }
            return null;
        }

        async function sendLiveInviteToOpponent(targetRawId) {
            const raw = String(targetRawId || '').trim();
            if (!raw) {
                showToast('أدخل ID المستهدف أولاً', true);
                return;
            }
            const toId = raw.startsWith('#') ? raw : '#' + raw.replace(/^#/, '');
            const payload = {
                fromId: String(currentUser ? currentUser.id : '#1001').slice(0, 50),
                fromName: String(currentUser ? currentUser.username : 'طالب').slice(0, 100),
                toId: String(toId).slice(0, 50),
                roomCode: String(battleRoomInfo.code || '#ROOM-101').slice(0, 60),
                roomName: String(battleRoomInfo.name || 'غرفة التحدي').slice(0, 150),
                sentAt: Date.now()
            };

            if (syncChannel) {
                syncChannel.postMessage({ type: 'live_invite', toId, invite: payload });
            }

            if (freeDbUrl && firebaseAuthToken) {
                const roomKey = sanitizeDbKey(battleRoomInfo.code || 'ROOM-101');
                const targetKey = sanitizeDbKey(toId);
                try {
                    await fetch(buildDbEndpoint(`rooms/${roomKey}`), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: String(battleRoomInfo.name || 'غرفة التحدي').slice(0, 150),
                            updatedAt: Date.now()
                        })
                    });

                    const res = await fetch(buildDbEndpoint(`rooms/${roomKey}/invites/${targetKey}`), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error('WRITE_DENIED');
                    showToast(`تم إرسال دعوة حية إلى ${toId} 📩`);
                    return;
                } catch (e) {
                    showToast('تعذر إرسال الدعوة عبر الخادم؛ أُرسلت محلياً', true);
                    return;
                }
            }

            showToast(`تم إرسال دعوة إلى ${toId} 📩`);
        }

        async function sendLiveInviteFromFriendModal() {
            const raw = (document.getElementById('friendNameOrIdInput')?.value || '').trim();
            if (!raw) {
                showToast('أدخل الـ ID أولاً', true);
                return;
            }
            await sendLiveInviteToOpponent(raw);
        }

        function handleIncomingInvite(invite) {
            if (!invite || !invite.fromId || (currentUser && invite.fromId === currentUser.id)) return;
            pendingIncomingInvite = invite;
            const banner = document.getElementById('incomingInviteBanner');
            const textEl = document.getElementById('incomingInviteText');
            if (textEl) {
                textEl.textContent = `📩 دعوة حية من ${invite.fromName} (${invite.fromId}) للانضمام إلى الغرفة ${invite.roomCode}`;
            }
            if (banner) banner.classList.remove('hidden');
            playGentleChime();
        }

        async function acceptIncomingInvite() {
            if (!pendingIncomingInvite) return;
            const inv = pendingIncomingInvite;
            battleRoomInfo = { name: inv.roomName || `غرفة ${inv.roomCode}`, code: inv.roomCode || '#ROOM-101' };
            updateBattleRoomBanner();
            if (!studyRoomFriends.some(f => f.studentId === inv.fromId)) {
                studyRoomFriends.push({ name: inv.fromName, studentId: inv.fromId, status: 'دعاك وقبلت الانضمام 🌐' });
                saveStudyRoomFriends();
                renderStudyRoomMembers();
            }
            if (freeDbUrl && firebaseAuthToken && currentUser) {
                const roomKey = sanitizeDbKey(inv.roomCode || battleRoomInfo.code);
                const myKey = sanitizeDbKey(currentUser.id);
                try {
                    await fetch(buildDbEndpoint(`rooms/${roomKey}/invites/${myKey}`), { method: 'DELETE' });
                } catch (e) {}
            }
            pendingIncomingInvite = null;
            document.getElementById('incomingInviteBanner')?.classList.add('hidden');
        }

        async function declineIncomingInvite() {
            if (freeDbUrl && firebaseAuthToken && currentUser && pendingIncomingInvite) {
                const roomKey = sanitizeDbKey(pendingIncomingInvite.roomCode || battleRoomInfo.code);
                const myKey = sanitizeDbKey(currentUser.id);
                try {
                    await fetch(buildDbEndpoint(`rooms/${roomKey}/invites/${myKey}`), { method: 'DELETE' });
                } catch (e) {}
            }
            pendingIncomingInvite = null;
            document.getElementById('incomingInviteBanner')?.classList.add('hidden');
        }

        function startInvitePolling() {
            clearInterval(invitePollTimerId);
            if (!freeDbUrl || !firebaseAuthToken || !currentUser) return;
            const myKey = sanitizeDbKey(currentUser.id);
            const roomKey = sanitizeDbKey(battleRoomInfo.code || 'ROOM-101');
            const poll = async () => {
                try {
                    const res = await fetch(buildDbEndpoint(`rooms/${roomKey}/invites/${myKey}`));
                    const data = await res.json();
                    if (data && data.fromId && (!pendingIncomingInvite || pendingIncomingInvite.sentAt !== data.sentAt)) {
                        handleIncomingInvite(data);
                    }
                } catch (e) {}
            };
            poll();
            invitePollTimerId = setInterval(poll, 4000);
        }

        /* ==================== الخصوصية والأمان والقفل التلقائي ==================== */
        function getSecurityStorageKey() { return `smartStudentSec_${currentUser && currentUser.id ? currentUser.id : 'guest'}`; }
        function getUserSecurityConfig() { const raw = JSON.parse(localStorage.getItem(getSecurityStorageKey()) || 'null'); return raw && typeof raw === 'object' ? raw : { pinHash: null, autoLockMinutes: 0 }; }
        function saveUserSecurityConfig(cfg) { localStorage.setItem(getSecurityStorageKey(), JSON.stringify(cfg)); }
        function saveAutoLockSetting() {
            const mins = parseInt(document.getElementById('autoLockMinutesSelect')?.value || '0', 10) || 0;
            const cfg = getUserSecurityConfig(); cfg.autoLockMinutes = mins; saveUserSecurityConfig(cfg); resetAutoLockTimer();
            showToast(mins > 0 ? `تم تفعيل القفل التلقائي بعد ${mins} دقيقة ⏱️` : 'تم تعطيل القفل التلقائي');
        }
        function resetAutoLockTimer() {
            clearTimeout(autoLockTimerId); if (!currentUser || screenLocked) return;
            const mins = parseInt(getUserSecurityConfig().autoLockMinutes || 0, 10) || 0;
            if (mins > 0) autoLockTimerId = setTimeout(() => { lockScreenNow(); showToast('تم قفل الشاشة تلقائياً لعدم النشاط 🔒'); }, mins * 60 * 1000);
        }
        ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => document.addEventListener(ev, resetAutoLockTimer, { passive: true }));
        async function hashSecretValue(secret) {
            const str = String(secret || '');
            if (window.crypto && window.crypto.subtle && window.TextEncoder) {
                const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
                return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
            }
            let h = 0; for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
            return 'fallback_' + String(h);
        }
        function openPrivacySecurityModal() {
            const cfg = getUserSecurityConfig();
            document.getElementById('quickPinInput').value = '';
            document.getElementById('autoLockMinutesSelect').value = String(cfg.autoLockMinutes || 0);
            document.getElementById('quickPinStatusText').textContent = cfg.pinHash ? 'الحالة: رمز PIN مفعّل لحماية الشاشة' : 'الحالة: رمز PIN غير مفعّل';
            document.getElementById('privacySecurityModal')?.classList.remove('hidden');
        }
        function closePrivacySecurityModal() { document.getElementById('privacySecurityModal')?.classList.add('hidden'); }
        async function saveQuickPin() {
            const pinVal = (document.getElementById('quickPinInput')?.value || '').trim(), cfg = getUserSecurityConfig();
            if (!pinVal) { cfg.pinHash = null; saveUserSecurityConfig(cfg); openPrivacySecurityModal(); showToast('تم إلغاء رمز القفل السريع PIN'); return; }
            if (pinVal.length < 4) { showToast('أدخل رمز PIN من 4 خانات أو أكثر', true); return; }
            cfg.pinHash = await hashSecretValue(pinVal); saveUserSecurityConfig(cfg); openPrivacySecurityModal(); showToast('تم حفظ رمز القفل السريع PIN 🔒');
        }
        function lockScreenNow() {
            if (!currentUser) return; clearTimeout(autoLockTimerId); screenLocked = true; sessionStorage.setItem('smartStudentScreenLocked', '1');
            closePrivacySecurityModal(); const inp = document.getElementById('unlockSecretInput'); if (inp) inp.value = '';
            document.getElementById('screenLockOverlay')?.classList.remove('hidden'); setTimeout(() => inp && inp.focus(), 40);
        }
        async function attemptUnlockScreen() {
            const entered = (document.getElementById('unlockSecretInput')?.value || '').trim(); if (!entered) { showToast('أدخل رمز PIN أو كلمة المرور', true); return; }
            const enteredHash = await hashSecretValue(entered), cfg = getUserSecurityConfig(), acc = getRegisteredAccounts().find(a => currentUser && a.email === currentUser.email);
            if ((cfg.pinHash && enteredHash === cfg.pinHash) || (acc && acc.passwordHash === enteredHash)) {
                screenLocked = false; sessionStorage.removeItem('smartStudentScreenLocked'); document.getElementById('screenLockOverlay')?.classList.add('hidden'); resetAutoLockTimer(); showToast('تم فتح القفل بنجاح 🔓');
            } else showToast('رمز القفل أو كلمة المرور غير صحيحة!', true);
        }
        function togglePrivacyMask() { privacyMasked = !privacyMasked; document.body.classList.toggle('privacy-masked', privacyMasked); const b = document.getElementById('topPrivacyMaskBtn'); if (b) b.textContent = privacyMasked ? '👁️ إظهار المحتوى' : '🙈 إخفاء المحتوى'; }
        function clearAllLocalPlatformData() {
            if (!confirm('هل أنت متأكد من مسح جميع البيانات المحلية؟')) return;
            ['smartStudentUser', 'smartStudentAccounts', 'smartStudentNotes', 'smartStudentTasks', 'smartStudentSharedProjects', 'smartStudentStudyFriends', 'smartStudentOpponentRefs', 'smartStudentNavState', 'smartStudentNotePaperTheme', 'smartStudentBotPos', 'smartStudentBotQuiet', 'smartStudentBotHidden', 'smartStudentWelcomeDismissed', 'smartStudentFreeDbUrl'].forEach(k => localStorage.removeItem(k));
            localStorage.removeItem(getSecurityStorageKey()); closePrivacySecurityModal(); location.reload();
        }

        /* ==================== الجسر الخارجي ومزامنة التبويبات ==================== */
        function initRealtimeBridge() {
            freeDbUrl = localStorage.getItem('smartStudentFreeDbUrl') || '';
            firebaseAuthUid = localStorage.getItem('smartStudentFirebaseUid') || '';
            firebaseAuthToken = sessionStorage.getItem('smartStudentFirebaseToken') || '';
            const dbInp = document.getElementById('freeDbUrlInput'); if (dbInp && freeDbUrl) dbInp.value = freeDbUrl;
            const uidInp = document.getElementById('firebaseUidInput'); if (uidInp && firebaseAuthUid) uidInp.value = firebaseAuthUid;
            const tokInp = document.getElementById('firebaseTokenInput'); if (tokInp && firebaseAuthToken) tokInp.value = firebaseAuthToken;
            if (freeDbUrl && firebaseAuthToken && firebaseAuthUid) {
                updateFreeDbStatusUi(`الحالة: متصل بقاعدة البيانات مع مصادقة (${firebaseAuthUid}) ✅`);
                publishMyProfileToFreeDb();
                syncSharedProjectsWithFreeDb(false);
                startInvitePolling();
                startProjectsPolling();
            } else if (freeDbUrl) {
                updateFreeDbStatusUi('الحالة: أدخل UID ورمز Auth ID Token لتفعيل المزامنة الآمنة');
            }
            if ('BroadcastChannel' in window && !syncChannel) {
                syncChannel = new BroadcastChannel('smart_student_real_people_channel');
                syncChannel.onmessage = (event) => {
                    const data = event.data; if (!data || !data.type) return;
                    if (data.type === 'peer_join' && data.peer && (!currentUser || data.peer.studentId !== currentUser.id)) {
                        if (!studyRoomFriends.some(f => f.studentId === data.peer.studentId)) { studyRoomFriends.push(data.peer); saveStudyRoomFriends(); renderStudyRoomMembers(); appendStudyChatMessage('جسر الدعوة 🌐', `انضم (${data.peer.name}) إلى الغرفة!`, false); }
                    } else if (data.type === 'room_chat' && data.sender && (!currentUser || data.senderId !== currentUser.id)) appendStudyChatMessage(data.sender, data.text, false);
                    else if (data.type === 'live_invite' && data.invite && currentUser && data.toId === currentUser.id) handleIncomingInvite(data.invite);
                    else if (data.type === 'shared_projects_updated' && Array.isArray(data.projects)) {
                        sharedProjects = data.projects;
                        saveSharedProjects(false);
                        if (activeSectionId === 'sharing') renderSharedProjects();
                    }
                };
            }
            if (syncChannel && currentUser) syncChannel.postMessage({ type: 'peer_join', peer: { name: currentUser.username, studentId: currentUser.id, status: 'متصل عبر الجسر 🌐' } });
        }

        function buildInviteUrl() {
            const url = new URL(window.location.href);
            url.searchParams.set('room', battleRoomInfo.code.replace('#', ''));
            url.searchParams.set('inviterId', (currentUser ? currentUser.id : '#1001').replace('#', ''));
            url.searchParams.set('inviterName', currentUser ? currentUser.username : 'طالب');
            return url.toString();
        }
        function checkUrlInviteParams() {
            const params = new URLSearchParams(window.location.search), roomParam = params.get('room'), inviterId = params.get('inviterId'), inviterName = params.get('inviterName');
            if (roomParam) { battleRoomInfo = { name: `غرفة مدعوة ${roomParam}`, code: `#${roomParam}` }; updateBattleRoomBanner(); }
            if (inviterId) { const normId = '#' + inviterId.replace(/^#/, ''); if ((!currentUser || currentUser.id !== normId) && !studyRoomFriends.some(f => f.studentId === normId)) { studyRoomFriends.push({ name: inviterName || `طالب ${normId}`, studentId: normId, status: 'دعاك عبر رابط الدعوة 🌐' }); saveStudyRoomFriends(); } }
        }
        function openExternalBridgeModal() { document.getElementById('inviteRoomLinkInput').value = buildInviteUrl(); document.getElementById('externalBridgeModal')?.classList.remove('hidden'); }
        function closeExternalBridgeModal() { document.getElementById('externalBridgeModal')?.classList.add('hidden'); }
        function copyInviteRoomLink() { copyTextToClipboard(buildInviteUrl(), 'تم نسخ رابط الدعوة للأشخاص الحقيقيين 🌐'); }

        /* ==================== نسخ، ترحيب، دليل، ونسخ احتياطي ==================== */
        function copyTextToClipboard(text, successMsg = 'تم النسخ إلى الحافظة 📋') {
            if (!text || !String(text).trim()) { showToast('لا يوجد نص لنسخه!', true); return; }
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(String(text)).then(() => showToast(successMsg)).catch(() => fallbackCopyText(String(text), successMsg));
            else fallbackCopyText(String(text), successMsg);
        }
        function fallbackCopyText(text, successMsg) {
            const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); showToast(successMsg); } catch (e) {} document.body.removeChild(ta);
        }
        function copyCalcResult() { copyTextToClipboard(document.getElementById('calcScreen')?.value.trim() || '', 'تم نسخ نتيجة الآلة الحاسبة 📋'); }
        function copyActiveNoteContent() {
            const title = document.getElementById('activeNoteTitle')?.value.trim() || '', content = getEditorPlainText();
            copyTextToClipboard(title ? `${title}\n\n${content}` : content, 'تم نسخ محتوى الملاحظة 📋');
        }
        function initStudentWelcomeBanner() {
            const banner = document.getElementById('studentWelcomeBanner'), idBadge = document.getElementById('welcomeUserIdBadge');
            if (!banner) return; if (idBadge) idBadge.textContent = currentUser ? currentUser.id : '#1001';
            banner.classList.toggle('hidden', localStorage.getItem('smartStudentWelcomeDismissed') === '1');
        }
        function dismissWelcomeBanner() { localStorage.setItem('smartStudentWelcomeDismissed', '1'); document.getElementById('studentWelcomeBanner')?.classList.add('hidden'); }
        function openGuideModal() { document.getElementById('studentGuideModal')?.classList.remove('hidden'); }
        function closeGuideModal() { document.getElementById('studentGuideModal')?.classList.add('hidden'); }
        function openBackupModal() { document.getElementById('backupModal')?.classList.remove('hidden'); }
        function closeBackupModal() { document.getElementById('backupModal')?.classList.add('hidden'); }
        function exportFullBackupJson() {
            const payload = { exportedAt: new Date().toISOString(), app: 'SmartStudentPlatform', accounts: getRegisteredAccounts(), currentUser, notes: notesList, tasks: tasksList, sharedProjects, studyRoomFriends, opponentRefsRegistry, activeAiOpponentId };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `smart-student-backup-${new Date().toISOString().slice(0, 10)}.json`;
            link.click(); URL.revokeObjectURL(url); showToast('تم تحميل النسخة الاحتياطية 💾');
        }
        function triggerRestoreBackupFile() { document.getElementById('restoreBackupFileInput')?.click(); }
        function handleRestoreBackupFile(event) {
            const file = event.target.files && event.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (Array.isArray(data.accounts)) saveRegisteredAccounts(data.accounts);
                    if (Array.isArray(data.notes) && data.notes.length > 0) { notesList = data.notes; activeNoteId = notesList[0].id; saveNotesToStorage(); }
                    if (Array.isArray(data.tasks)) { tasksList = data.tasks; saveTasks(); }
                    if (Array.isArray(data.sharedProjects)) { sharedProjects = data.sharedProjects; saveSharedProjects(); }
                    if (Array.isArray(data.studyRoomFriends)) { studyRoomFriends = data.studyRoomFriends; saveStudyRoomFriends(); }
                    if (data.opponentRefsRegistry) { opponentRefsRegistry = data.opponentRefsRegistry; saveOpponentRefsRegistry(); }
                    if (data.activeAiOpponentId) activeAiOpponentId = data.activeAiOpponentId;
                    initWorkspaceData(); closeBackupModal(); showToast('تمت استعادة البيانات ✅');
                } catch (err) { showToast('تعذر قراءة ملف النسخة الاحتياطية', true); }
                event.target.value = '';
            };
            reader.readAsText(file);
        }

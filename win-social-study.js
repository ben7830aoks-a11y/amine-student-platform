        /* ==================== مشاركة المشاريع ==================== */
        function initSharedProjects() { const saved = JSON.parse(localStorage.getItem('smartStudentSharedProjects') || 'null'); sharedProjects = Array.isArray(saved) ? saved : [{ id: 101, author: 'سارة منصور', authorId: '#2045', title: 'حاسبة مصفوفات متقدمة بلغة Python', domain: 'الرياضيات والعلوم', content: 'import numpy as np\nA = np.array([[2, 4], [1, 3]])\nprint("Determinant:", np.linalg.det(A))', likes: 5, dislikes: 0, userReactions: {}, comments: [{ author: 'أمين', text: 'شرح واضح ومفيد جداً!' }] }]; saveSharedProjects(false); }
        function saveSharedProjects(pushRemote = true) {
            localStorage.setItem('smartStudentSharedProjects', JSON.stringify(sharedProjects));
            if (syncChannel) syncChannel.postMessage({ type: 'shared_projects_updated', projects: sharedProjects });
            if (pushRemote && freeDbUrl && firebaseAuthToken) syncSharedProjectsWithFreeDb(true);
        }
        function openShareModal() {
            const activeNote = notesList.find(n => n.id === activeNoteId) || notesList[0];
            document.getElementById('shareProjTitle').value = activeNote ? activeNote.title : '';
            document.getElementById('shareProjContent').value = getEditorPlainText() || (activeNote ? activeNote.content : '');
            document.getElementById('shareProjectModal').classList.remove('hidden');
        }
        function closeShareModal() { document.getElementById('shareProjectModal').classList.add('hidden'); }
        function submitSharedProject() {
            const title = document.getElementById('shareProjTitle').value.trim(), domain = document.getElementById('shareProjDomain').value, content = document.getElementById('shareProjContent').value.trim();
            if (!title || !content) { showToast('يرجى إدخال عنوان المشروع ومحتواه', true); return; }
            sharedProjects.unshift({ id: Date.now(), author: currentUser ? currentUser.username : 'طالب', authorId: currentUser ? currentUser.id : '#1001', title, domain, content, likes: 0, dislikes: 0, userReactions: {}, comments: [] });
            saveSharedProjects(true); closeShareModal(); renderSharedProjects(); showToast('تم نشر مشروعك بنجاح 🚀');
        }
        function toggleProjectReaction(projectId, reactionType) {
            const proj = sharedProjects.find(p => p.id === projectId); if (!proj) return;
            const actorKey = (currentUser && currentUser.id) ? currentUser.id : 'guest_user';
            if (!proj.userReactions || typeof proj.userReactions !== 'object') proj.userReactions = {};
            const prev = proj.userReactions[actorKey] || null;
            if (prev === 'like') proj.likes = Math.max(0, (proj.likes || 0) - 1);
            if (prev === 'dislike') proj.dislikes = Math.max(0, (proj.dislikes || 0) - 1);
            if (prev === reactionType) { delete proj.userReactions[actorKey]; showToast('تم إلغاء التفاعل'); }
            else { proj.userReactions[actorKey] = reactionType; if (reactionType === 'like') { proj.likes = (proj.likes || 0) + 1; showToast('أعجبك المشروع 👍'); } else { proj.dislikes = (proj.dislikes || 0) + 1; showToast('تم تسجيل ديسلايك 👎'); } }
            saveSharedProjects(true); renderSharedProjects();
        }
        function toggleCommentsDrawer(projectId) { if (openCommentsDrawerIds.has(projectId)) openCommentsDrawerIds.delete(projectId); else openCommentsDrawerIds.add(projectId); renderSharedProjects(); }
        function addProjectComment(projectId) {
            const inp = document.getElementById(`commentInput-${projectId}`), text = inp ? inp.value.trim() : ''; if (!text) { showToast('اكتب تعليقاً أولاً', true); return; }
            const proj = sharedProjects.find(p => p.id === projectId); if (!proj) return;
            if (!Array.isArray(proj.comments)) proj.comments = [];
            proj.comments.push({ author: currentUser ? currentUser.username : 'طالب', text }); openCommentsDrawerIds.add(projectId);
            saveSharedProjects(true); renderSharedProjects(); showToast('تم إضافة تعليقك 💬');
        }
        function renderSharedProjects() {
            const feed = document.getElementById('sharedProjectsFeed'); feed.innerHTML = '';
            const actorKey = (currentUser && currentUser.id) ? currentUser.id : 'guest_user';
            sharedProjects.forEach(proj => {
                const commentsCount = Array.isArray(proj.comments) ? proj.comments.length : 0, isDrawerOpen = openCommentsDrawerIds.has(proj.id), myReaction = (proj.userReactions && proj.userReactions[actorKey]) || null;
                const card = document.createElement('div'); card.className = 'project-feed-card';
                let commentsHtml = '';
                if (isDrawerOpen) {
                    const listHtml = (proj.comments || []).map(c => `<div class="comment-item-box"><strong style="color:var(--accent);">${escapeHtml(c.author)}:</strong> <span>${escapeHtml(c.text)}</span></div>`).join('') || `<div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">لا توجد تعليقات بعد.</div>`;
                    commentsHtml = `<div class="comments-drawer">${listHtml}<div style="display:flex;gap:8px;margin-top:8px;"><input type="text" id="commentInput-${proj.id}" placeholder="اكتب تعليقك..." style="flex:1;padding:8px 10px;background:var(--card-bg);color:#fff;border:1px solid var(--border);border-radius:7px;font-size:13px;" onkeypress="if(event.key==='Enter') addProjectComment(${proj.id})"><button type="button" onclick="addProjectComment(${proj.id})" style="background:var(--primary);color:#fff;border:none;padding:8px 14px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:bold;">إرسال</button></div></div>`;
                }
                card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"><div><strong style="color:#f8fafc;font-size:16px;">${escapeHtml(proj.title)}</strong><div style="font-size:12px;color:#94a3b8;margin-top:3px;">بواسطة: <span class="sensitive-content">${escapeHtml(proj.author)}</span> <span class="player-id-pill">${escapeHtml(proj.authorId || '#1001')}</span></div></div><span class="domain-badge">${escapeHtml(proj.domain)}</span></div><div class="code-preview-box sensitive-content">${escapeHtml(proj.content)}</div><div class="reaction-actions-row"><button type="button" class="reaction-btn ${myReaction === 'like' ? 'active-like' : ''}" onclick="toggleProjectReaction(${proj.id}, 'like')">👍 إعجاب <span>${proj.likes || 0}</span></button><button type="button" class="reaction-btn ${myReaction === 'dislike' ? 'active-dislike' : ''}" onclick="toggleProjectReaction(${proj.id}, 'dislike')">👎 ديسلايك <span>${proj.dislikes || 0}</span></button><button type="button" class="reaction-btn" onclick="toggleCommentsDrawer(${proj.id})">💬 تعليقات <span>${commentsCount}</span></button></div>${commentsHtml}`;
                feed.appendChild(card);
            });
        }

        /* ==================== غرفة المذاكرة ==================== */
        function initStudyRoom() {
            const savedFriends = JSON.parse(localStorage.getItem('smartStudentStudyFriends') || 'null');
            studyRoomFriends = Array.isArray(savedFriends) && savedFriends.length ? savedFriends : [{ name: 'سارة منصور', studentId: '#2045', status: 'تراجع الجبر الخطي 📐' }, { name: 'كريم بن علي', studentId: '#3109', status: 'يكتب كود Python 💻' }, { name: 'ليلى مراد', studentId: '#4412', status: 'تحل مسائل الفيزياء ⚛️' }];
            saveStudyRoomFriends(); renderStudyRoomMembers(); updateStudyPomodoroDisplay();
            const chatBox = document.getElementById('studyChatMessages');
            if (chatBox && chatBox.children.length === 0) appendStudyChatMessage('سارة منصور', 'أهلاً! من يراجع معي اليوم؟', false);
        }
        function saveStudyRoomFriends() { localStorage.setItem('smartStudentStudyFriends', JSON.stringify(studyRoomFriends)); }
        function openAddFriendModal() { document.getElementById('friendNameOrIdInput').value = ''; document.getElementById('friendTopicInput').value = ''; document.getElementById('lookupUserResultBox').textContent = ''; document.getElementById('addFriendModal').classList.remove('hidden'); setTimeout(() => document.getElementById('friendNameOrIdInput').focus(), 30); }
        function closeAddFriendModal() { document.getElementById('addFriendModal').classList.add('hidden'); }
        function submitAddFriend() {
            const raw = document.getElementById('friendNameOrIdInput').value.trim(), topic = document.getElementById('friendTopicInput').value.trim();
            if (!raw) { showToast('اكتب اسم الصديق أو الـ ID أولاً', true); return; }
            let name = raw, studentId = '#' + Math.floor(2000 + Math.random() * 7999);
            const matchedAcc = getRegisteredAccounts().find(a => a.id === (raw.startsWith('#') ? raw : '#' + raw) || a.username.toLowerCase() === raw.toLowerCase());
            if (matchedAcc) { name = matchedAcc.username; studentId = matchedAcc.id; }
            else { const m = raw.match(/#\d{2,6}/); if (m) { studentId = m[0]; name = raw.replace(m[0], '').trim() || `طالب ${studentId}`; } else if (/^\d{3,6}$/.test(raw)) { studentId = '#' + raw; name = `طالب ${studentId}`; } }
            studyRoomFriends.push({ name, studentId, status: topic || 'متصل للمذاكرة 📚' }); saveStudyRoomFriends(); closeAddFriendModal(); renderStudyRoomMembers(); appendStudyChatMessage('النظام', `انضم (${name} ${studentId}) إلى غرفة المذاكرة!`, false); showToast(`تمت إضافة ${name} (${studentId}) ✅`);
        }
        function renderStudyRoomMembers() {
            const container = document.getElementById('onlineStudentsList'); container.innerHTML = '';
            const meDiv = document.createElement('div'); meDiv.style.marginBottom = '10px'; meDiv.style.fontSize = '13px';
            meDiv.innerHTML = `🟢 <strong class="sensitive-content">${escapeHtml(currentUser ? currentUser.username : 'أنت')}</strong> <span class="player-id-pill">${escapeHtml(currentUser ? currentUser.id : '#1001')}</span> <span style="color:#94a3b8;font-size:11px;">(أنت)</span>`;
            container.appendChild(meDiv);
            studyRoomFriends.forEach(f => { const div = document.createElement('div'); div.style.marginBottom = '10px'; div.style.fontSize = '13px'; div.innerHTML = `🟢 <strong class="sensitive-content">${escapeHtml(f.name)}</strong> <span class="player-id-pill">${escapeHtml(f.studentId)}</span><div style="color:#94a3b8;font-size:11px;padding-right:18px;">${escapeHtml(f.status)}</div>`; container.appendChild(div); });
            document.getElementById('studyActiveCountBadge').textContent = `🟢 ${1 + studyRoomFriends.length} طلاب نشطون الآن`;
        }
        function announceStudyStatus() { const st = document.getElementById('myStudyStatus').value; appendStudyChatMessage('النظام', `${currentUser ? currentUser.username : 'أنت'} غيّر حالته إلى: ${st}`, false); }
        function sendStudyMessage() { const inp = document.getElementById('studyChatInput'), txt = inp.value.trim(); if (!txt) return; appendStudyChatMessage(currentUser ? currentUser.username : 'أنت', txt, true); if (syncChannel) syncChannel.postMessage({ type: 'room_chat', sender: currentUser ? currentUser.username : 'طالب', senderId: currentUser ? currentUser.id : '#1001', text: txt }); inp.value = ''; }
        function appendStudyChatMessage(sender, text, isSelf) {
            const box = document.getElementById('studyChatMessages'), div = document.createElement('div');
            div.className = 'chat-msg ' + (isSelf ? 'chat-msg-user' : 'chat-msg-other');
            div.innerHTML = `<div style="font-size:11px;opacity:0.8;margin-bottom:3px;"><strong>${escapeHtml(sender)}</strong></div><div class="sensitive-content">${escapeHtml(text)}</div>`;
            box.appendChild(div); box.scrollTop = box.scrollHeight;
        }
        function updateStudyPomodoroDisplay() { const m = String(Math.floor(studyPomoSeconds / 60)).padStart(2, '0'), s = String(studyPomoSeconds % 60).padStart(2, '0'); document.getElementById('studyPomodoroTimer').textContent = `${m}:${s}`; }
        function setStudyPomodoroMode(mode) { clearInterval(studyPomoInterval); studyPomoRunning = false; studyPomoMode = mode; studyPomoSeconds = mode === 'focus' ? 25 * 60 : 5 * 60; document.getElementById('studyPomoModeBadge').textContent = mode === 'focus' ? '🎯 وقت التركيز' : '☕ استراحة قصيرة'; document.getElementById('studyPomoToggleBtn').textContent = '▶️ بدء'; updateStudyPomodoroDisplay(); }
        function toggleStudyPomodoro() {
            const btn = document.getElementById('studyPomoToggleBtn');
            if (studyPomoRunning) { clearInterval(studyPomoInterval); studyPomoRunning = false; btn.textContent = '▶️ بدء'; }
            else { studyPomoRunning = true; btn.textContent = '⏸️ إيقاف'; studyPomoInterval = setInterval(() => { if (studyPomoSeconds > 0) { studyPomoSeconds--; updateStudyPomodoroDisplay(); } else { clearInterval(studyPomoInterval); studyPomoRunning = false; btn.textContent = '▶️ بدء'; playGentleChime(); showToast(studyPomoMode === 'focus' ? 'انتهى وقت التركيز!' : 'انتهت الاستراحة!'); } }, 1000); }
        }

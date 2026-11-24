        /* ==================== ورشة المهام وبومودورو ==================== */
        function initTasks() { const saved = JSON.parse(localStorage.getItem('smartStudentTasks') || 'null'); tasksList = Array.isArray(saved) ? saved : [{ id: 1, title: 'مراجعة درس الدوال والمتتاليات', priority: 'عاجل 🔴', completed: false }, { id: 2, title: 'كتابة ملخص المشروع في دفتر الملاحظات', priority: 'متوسط 🟡', completed: false }]; saveTasks(); renderTasks(); updatePomodoroDisplay(); }
        function saveTasks() { localStorage.setItem('smartStudentTasks', JSON.stringify(tasksList)); }
        function addTask() { const inp = document.getElementById('taskInput'), prio = document.getElementById('taskPriority').value, title = inp.value.trim(); if (!title) { showToast('يرجى كتابة عنوان المهمة أولاً', true); return; } tasksList.unshift({ id: Date.now(), title, priority: prio, completed: false }); inp.value = ''; saveTasks(); renderTasks(); showToast('تمت إضافة المهمة ✅'); }
        function toggleTask(id) { const t = tasksList.find(x => x.id === id); if (!t) return; t.completed = !t.completed; saveTasks(); renderTasks(); if (t.completed) playGentleChime(); }
        function deleteTask(id) { tasksList = tasksList.filter(x => x.id !== id); saveTasks(); renderTasks(); }
        function renderTasks() {
            const pList = document.getElementById('taskListPending'), cList = document.getElementById('taskListCompleted'); pList.innerHTML = ''; cList.innerHTML = '';
            const total = tasksList.length, done = tasksList.filter(x => x.completed).length, pct = total > 0 ? Math.round((done / total) * 100) : 0;
            document.getElementById('taskStatsText').textContent = `المهام المنجزة: ${done} / ${total} (${pct}%)`; document.getElementById('taskProgressBar').style.width = pct + '%';
            tasksList.forEach(task => {
                const div = document.createElement('div'); div.className = 'list-item';
                div.style.borderRightColor = task.completed ? '#10b981' : 'var(--primary)'; div.style.opacity = task.completed ? '0.78' : '1';
                div.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex:1;"><input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})" style="width:16px;height:16px;cursor:pointer;"><span style="${task.completed ? 'text-decoration:line-through;color:#94a3b8;' : ''}">${escapeHtml(task.title)}</span><span style="font-size:11px;background:var(--card-bg);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">${escapeHtml(task.priority)}</span></div><button class="btn btn-danger" onclick="deleteTask(${task.id})">حذف</button>`;
                if (task.completed) cList.appendChild(div); else pList.appendChild(div);
            });
        }
        function updatePomodoroDisplay() { const m = String(Math.floor(pomodoroSeconds / 60)).padStart(2, '0'), s = String(pomodoroSeconds % 60).padStart(2, '0'); document.getElementById('pomodoroTimer').textContent = `${m}:${s}`; }
        function togglePomodoro() {
            const btn = document.getElementById('pomodoroBtn');
            if (pomodoroRunning) { clearInterval(pomodoroInterval); pomodoroRunning = false; btn.textContent = 'بدء'; }
            else { pomodoroRunning = true; btn.textContent = 'إيقاف'; pomodoroInterval = setInterval(() => { if (pomodoroSeconds > 0) { pomodoroSeconds--; updatePomodoroDisplay(); } else { clearInterval(pomodoroInterval); pomodoroRunning = false; btn.textContent = 'بدء'; playGentleChime(); showToast('انتهت جلسة التركيز! خذ استراحة قصيرة 🎉'); } }, 1000); }
        }
        function resetPomodoro() { clearInterval(pomodoroInterval); pomodoroRunning = false; pomodoroSeconds = 25 * 60; document.getElementById('pomodoroBtn').textContent = 'بدء'; updatePomodoroDisplay(); }

/* ==========================================================================
   bot-academic.js
   Turns the teacher's drawer into the academic AI assistant.
   - Replaces the local canned replies with the real model (via Platform.askAi).
   - Knows the open section and the note being edited, so answers fit the student's work.
   - Quick actions for the common academic tasks.
   ========================================================================== */
(function () {
    const CONSENT_KEY = 'ssp_ai_consent';
    const MAX_PROMPT = 7000;

    const SYSTEM = [
        'أنت مساعد أكاديمي لطالب جامعي. أجب بالعربية الواضحة.',
        'اشرح خطوة بخطوة، واطرح سؤالاً توجيهياً عند الحاجة، ولا تكتب الحل النهائي لواجب مطلوب تسليمه إلا إذا طلب الطالب ذلك صراحة.',
        'اعتمد على المحتوى المعطى لك، وقل بوضوح إن لم تكن متأكداً.',
        'لا تنسخ نصوص الكتب، واكتب بكلماتك.'
    ].join(' ');

    const drawerTitle = () => document.querySelector('#botInspectorDrawer strong');
    const chatBox = () => document.getElementById('botMiniChat');
    const input = () => document.getElementById('botMiniInput');

    function currentContext() {
        const sec = (typeof activeSectionId !== 'undefined' && activeSectionId) || 'الصفحة الرئيسية';
        let note = '';
        try {
            if (typeof getEditorPlainText === 'function') note = getEditorPlainText().slice(0, 1500);
        } catch (_) {}
        return `القسم المفتوح: ${sec}` + (note ? `\nالملاحظة المفتوحة (مقتطف):\n${note}` : '');
    }

    // Gesture state on the teacher: thinking while waiting, nod on success, shake on error.
    function setBotState(state, ms) {
        const w = document.getElementById('floatingBotWrapper');
        if (!w) return;
        w.classList.remove('bot-thinking', 'bot-speaking', 'bot-nod', 'bot-error');
        if (state) w.classList.add(state);
        if (state && ms) setTimeout(() => w.classList.remove(state), ms);
    }

    function appendMsg(sender, html, isUser) {
        const box = chatBox();
        if (!box) return;
        const div = document.createElement('div');
        div.style.cssText = 'padding:7px 10px; margin-bottom:6px; border-radius:8px; font-size:12px; line-height:1.6; '
            + (isUser ? 'background:rgba(37,99,235,0.22); color:#dbeafe;' : 'background:rgba(15,23,42,0.92); color:#e2e8f0; border:1px solid rgba(148,163,184,0.25);');
        const label = document.createElement('strong');
        label.style.color = isUser ? '#38bdf8' : '#34d399';
        label.textContent = sender + ': ';
        const body = document.createElement('span');
        if (isUser) body.textContent = html; else body.innerHTML = html;
        div.append(label, body);
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }

    function consent() {
        if (localStorage.getItem(CONSENT_KEY) === '1') return true;
        const ok = confirm('سيُرسل سؤالك ومقتطف من الملاحظة المفتوحة إلى خدمة الذكاء الاصطناعي للإجابة. هل توافق؟');
        if (ok) localStorage.setItem(CONSENT_KEY, '1');
        return ok;
    }

    async function ask(question) {
        const q = String(question || '').trim();
        if (!q) return;
        if (!window.Platform || !window.Platform.AI_PROXY_URL) {
            appendMsg('المساعد', 'المساعد الأكاديمي غير مربوط بالخادم بعد.', false);
            return;
        }
        if (!consent()) { appendMsg('المساعد', 'لم يتم الإرسال.', false); return; }

        appendMsg(window.currentUser?.username || 'أنت', q, true);
        appendMsg('المساعد', '<em>جاري التفكير...</em>', false);
        setBotState('bot-thinking');
        const thinking = chatBox()?.lastElementChild;

        const prompt = `${SYSTEM}\n\n${currentContext()}\n\nسؤال الطالب:\n${q}`.slice(0, MAX_PROMPT);
        try {
            const reply = await window.Platform.askAi(prompt);
            const html = window.Platform.markdownToSafeHtml(String(reply || '').trim() || 'لم يصل رد.');
            if (thinking) thinking.remove();
            appendMsg('المساعد', html, false);
            setBotState('bot-speaking', 2600);
            setTimeout(() => setBotState('bot-nod', 1400), 600);
        } catch (err) {
            console.error('[academic-assistant]', err);
            if (thinking) thinking.remove();
            appendMsg('المساعد', 'تعذر الحصول على الرد الآن. تحقق من اتصالك أو من الخادم الوسيط.', false);
            setBotState('bot-error', 1600);
        }
    }

    const QUICK = [
        { label: '📖 اشرح الملاحظة', q: 'اشرح لي محتوى الملاحظة المفتوحة بشكل مبسط مع النقاط الأساسية.' },
        { label: '🧭 حل خطوة بخطوة', q: 'ساعدني أحل هذه المسألة خطوة بخطوة، واسألني عن كل خطوة قبل الانتقال للتالية.' },
        { label: '❓ اختبرني', q: 'اطرح عليّ 3 أسئلة من محتوى الملاحظة المفتوحة، وانتظر إجابتي قبل التصحيح.' },
        { label: '✍️ صحّح صياغتي', q: 'راجع صياغة الفقرة في الملاحظة المفتوحة واقترح تحسينات على الترابط والوضوح، دون أن تكتبها بدلاً عني.' }
    ];

    function buildQuickActions() {
        const drawer = document.getElementById('botInspectorDrawer');
        const row = drawer && drawer.querySelector('#botMiniInput')?.parentElement;
        if (!drawer || !row || document.getElementById('botAcademicQuick')) return;
        const wrap = document.createElement('div');
        wrap.id = 'botAcademicQuick';
        wrap.style.cssText = 'display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px;';
        QUICK.forEach(item => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = item.label;
            b.style.cssText = 'font-size:11px; padding:5px 8px; border-radius:7px; border:1px solid var(--accent); background:transparent; color:#e2e8f0; cursor:pointer;';
            b.onclick = () => ask(item.q);
            wrap.appendChild(b);
        });
        drawer.insertBefore(wrap, row);
    }

    // The old local replies are replaced by the real assistant.
    window.sendBotMiniPrompt = function sendBotMiniPrompt() {
        const inp = input();
        const text = (inp?.value || '').trim();
        if (!text) return;
        inp.value = '';
        ask(text);
    };

    document.addEventListener('DOMContentLoaded', () => {
        const t = drawerTitle();
        if (t) t.textContent = '🤖 المساعد الأكاديمي';
        buildQuickActions();
        const box = chatBox();
        if (box && box.children.length === 0) {
            appendMsg('المساعد', 'أهلاً! اسألني عن أي موضوع دراسي، أو استخدم الأزرار السريعة. أستطيع أيضاً شرح الملاحظة المفتوحة.', false);
        }
    });
})();

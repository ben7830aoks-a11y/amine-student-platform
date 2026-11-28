/* ==========================================================================
   bot-walker.js
   The teacher walks to a free corner when it covers something important
   (buttons, inputs, cards, banners). It never moves while the user drags it.
   ========================================================================== */
(function () {
    const wrapper = document.getElementById('floatingBotWrapper');
    const fab = document.getElementById('botFabBtn');
    if (!wrapper || !fab) return;

    const IMPORTANT = [
        'button', 'input', 'textarea', 'select', 'a[href]',
        '.card', '.modal-box', '.lock-card', '.battle-room-banner', '.incoming-invite-banner',
        '.student-welcome-banner', '.battle-question-card', '.battle-options-grid', '.mobile-bottom-nav',
        '.nav-btn', 'h1', 'h2', 'h3', 'canvas', 'iframe', 'img', 'table', '.hp-bar-track'
    ].join(',');

    let dragging = false, walking = false, lastMoveAt = 0, dragReleaseTimer = null;
    const PAD = 6;

    fab.addEventListener('pointerdown', () => { dragging = true; clearTimeout(dragReleaseTimer); });
    const release = () => { clearTimeout(dragReleaseTimer); dragReleaseTimer = setTimeout(() => { dragging = false; }, 400); };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    function visible(el) {
        if (!el.getClientRects().length) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return false;
        return !el.closest('.hidden');
    }

    function overlaps(a, b) {
        return a.left < b.right + PAD && a.right + PAD > b.left && a.top < b.bottom + PAD && a.bottom + PAD > b.top;
    }

    function coveredRects(rect) {
        const hits = [];
        document.querySelectorAll(IMPORTANT).forEach(el => {
            if (wrapper.contains(el) || !visible(el)) return;
            const r = el.getBoundingClientRect();
            if (r.width < 4 || r.height < 4) return;
            if (overlaps(rect, r)) hits.push(r);
        });
        return hits;
    }

    // Candidate positions spread over the whole viewport (left, right, top and bottom),
    // so the teacher can walk sideways as well as up and down.
    function spots(w, h) {
        const m = 10, top0 = 56;
        const W = window.innerWidth, H = window.innerHeight;
        const cols = Math.max(3, Math.min(8, Math.floor(W / 220)));
        const rows = Math.max(3, Math.min(6, Math.floor(H / 200)));
        const out = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const left = m + (c * (W - w - 2 * m)) / (cols - 1);
                const top = top0 + (r * (H - h - top0 - m)) / (rows - 1);
                out.push({ left: Math.round(Math.max(m, Math.min(W - w - m, left))), top: Math.round(Math.max(top0, Math.min(H - h - m, top))) });
            }
        }
        return out;
    }

    function rectAt(s, w, h) {
        return { left: s.left, top: s.top, right: s.left + w, bottom: s.top + h };
    }

    function walkTo(target, facingLeft, secsHint) {
        walking = true;
        lastMoveAt = Date.now();
        wrapper.classList.add('bot-walking');
        wrapper.classList.toggle('face-left', facingLeft);
        wrapper.style.bottom = 'auto';
        wrapper.style.right = 'auto';
        const dist = Math.hypot(target.left - parseFloat(wrapper.style.left || 0), target.top - parseFloat(wrapper.style.top || 0));
        const secs = Math.min(3.2, Math.max(0.9, dist / 260));
        wrapper.style.transition = `left ${secs}s linear, top ${secs}s linear`;
        wrapper.style.left = target.left + 'px';
        wrapper.style.top = target.top + 'px';
        try { localStorage.setItem('smartStudentBotPos', JSON.stringify({ left: target.left, top: target.top })); } catch (_) {}
        setTimeout(() => {
            wrapper.style.transition = '';
            wrapper.classList.remove('bot-walking');
            walking = false;
        }, secs * 1000 + 50);
    }

    function check() {
        if (dragging || walking || document.hidden) return;
        if (Date.now() - lastMoveAt < 3500) return;
        if (wrapper.classList.contains('hidden')) return;

        const w = wrapper.offsetWidth, h = wrapper.offsetHeight;
        const cur = wrapper.getBoundingClientRect();
        if (!cur.width) return;
        if (coveredRects(cur).length === 0) return;

        let best = null, bestScore = Infinity;
        for (const s of spots(w, h)) {
            const dist = Math.hypot(s.left - cur.left, s.top - cur.top);
            if (dist < 60) continue;                       // do not shuffle in place
            const cover = coveredRects(rectAt(s, w, h)).length;
            const score = cover * 1000 + dist * 0.6;
            if (score < bestScore) { bestScore = score; best = s; }
        }
        if (best) walkTo(best, best.left < cur.left);
    }

    setInterval(check, 1200);
    window.addEventListener('resize', () => { if (!walking) check(); });
})();

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

    function spots(w, h) {
        const m = 10, W = window.innerWidth, H = window.innerHeight;
        return [
            { left: m, top: H - h - m },                       // bottom-left
            { left: W - w - m, top: H - h - m },               // bottom-right
            { left: m, top: m + 60 },                          // top-left (below the header)
            { left: W - w - m, top: m + 60 },                  // top-right
            { left: m, top: (H - h) / 2 },                     // middle-left
            { left: W - w - m, top: (H - h) / 2 }              // middle-right
        ];
    }

    function rectAt(s, w, h) {
        return { left: s.left, top: s.top, right: s.left + w, bottom: s.top + h };
    }

    function walkTo(target, facingLeft) {
        walking = true;
        lastMoveAt = Date.now();
        wrapper.classList.add('bot-walking');
        wrapper.classList.toggle('face-left', facingLeft);
        wrapper.style.bottom = 'auto';
        wrapper.style.right = 'auto';
        wrapper.style.transition = 'left 1.4s linear, top 1.4s linear';
        wrapper.style.left = target.left + 'px';
        wrapper.style.top = target.top + 'px';
        try { localStorage.setItem('smartStudentBotPos', JSON.stringify({ left: target.left, top: target.top })); } catch (_) {}
        setTimeout(() => {
            wrapper.style.transition = '';
            wrapper.classList.remove('bot-walking');
            walking = false;
        }, 1450);
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
            const r = rectAt(s, w, h);
            const cover = coveredRects(r).length;
            const dist = Math.hypot(s.left - cur.left, s.top - cur.top);
            const score = cover * 1000 + dist;
            if (score < bestScore) { bestScore = score; best = s; }
        }
        if (best) walkTo(best, best.left < cur.left);
    }

    setInterval(check, 1200);
    window.addEventListener('resize', () => { if (!walking) check(); });
})();

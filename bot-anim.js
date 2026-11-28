/* ==========================================================================
   bot-anim.js
   Small behaviours for the teacher figure:
   - looks toward the mouse; - walks in on the first load;
   - pauses its animation while the tab is in the background.
   The state gestures (thinking, speaking, nod, error) are set by bot-academic.js.
   ========================================================================== */
(function () {
    const wrapper = document.getElementById('floatingBotWrapper');
    const fab = document.getElementById('botFabBtn');
    if (!wrapper || !fab) return;

    // Head turns toward the pointer, within a small range.
    document.addEventListener('mousemove', (e) => {
        const r = fab.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(200, window.innerWidth / 2);
        wrapper.style.setProperty('--look', String(Math.max(-1, Math.min(1, dx))));
    }, { passive: true });

    // Walks in from the side on the first load.
    wrapper.classList.add('bot-entering');
    setTimeout(() => wrapper.classList.remove('bot-entering'), 2400);

    // Stop animating while the page is in the background, to save battery.
    const syncPaused = () => document.body.classList.toggle('bot-paused', document.hidden);
    document.addEventListener('visibilitychange', syncPaused);
    syncPaused();
})();

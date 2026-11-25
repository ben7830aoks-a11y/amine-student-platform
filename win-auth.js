/* ==================== لغة ومظهر ودخول ==================== */
function toggleLangMenu() {
    const menu = document.getElementById('langMenu');
    if (menu) menu.classList.toggle('show');
}

function changeLanguage(lang) {
    currentLang = lang;
    const t = (typeof i18n !== 'undefined' && i18n[lang]) ? i18n[lang] : null;
    const root = document.getElementById('htmlRoot');
    if (root && t) {
        root.setAttribute('lang', lang);
        root.setAttribute('dir', t.dir || 'rtl');
    }
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active-lang'));
    const ab = document.getElementById('lang' + lang.charAt(0).toUpperCase() + lang.slice(1));
    if (ab) ab.classList.add('active-lang');
    if (t) {
        Object.keys(t).forEach(k => {
            if (k !== 'dir') {
                const el = document.getElementById(k);
                if (el) el.textContent = t[k];
            }
        });
    }
    const menu = document.getElementById('langMenu');
    if (menu) menu.classList.remove('show');
}

function setGender(gender) {
    selectedGender = gender === 'female' ? 'female' : 'male';
    const bm = document.getElementById('regBtnMale');
    const bf = document.getElementById('regBtnFemale');
    const logoIcon = document.getElementById('logoIcon');
    if (selectedGender === 'female') {
        document.body.classList.add('female-theme');
        if (bf) bf.classList.add('active-female');
        if (bm) bm.classList.remove('active-male');
        if (logoIcon) logoIcon.textContent = '👩‍🎓';
    } else {
        document.body.classList.remove('female-theme');
        if (bm) bm.classList.add('active-male');
        if (bf) bf.classList.remove('active-female');
        if (logoIcon) logoIcon.textContent = '👨‍🎓';
    }
}

function toggleAuthMode(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const isRegister = mode === 'register';
    if (loginForm) loginForm.classList.toggle('hidden', isRegister);
    if (registerForm) registerForm.classList.toggle('hidden', !isRegister);
    setTimeout(() => {
        const focusTarget = isRegister
            ? document.getElementById('regUsername')
            : document.getElementById('loginEmail');
        if (focusTarget) focusTarget.focus();
    }, 30);
}

function notifyAuthMessage(msg, isError = false) {
    if (typeof showToast === 'function') {
        showToast(msg, isError);
        return;
    }
    const banner = document.getElementById('toastBanner');
    if (banner) {
        banner.textContent = msg;
        banner.style.background = isError ? '#ef4444' : '#10b981';
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 3500);
    } else {
        alert(msg);
    }
}

async function safeHashPassword(secret) {
    const raw = String(secret || '');
    if (typeof hashSecretValue === 'function') {
        try {
            return await hashSecretValue(raw);
        } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof TextEncoder !== 'undefined') {
        try {
            const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (_) {}
    }
    let h1 = 0x811c9dc5;
    let h2 = 0x1b873593;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw.charCodeAt(i);
        h1 ^= ch;
        h1 = Math.imul(h1, 0x01000193);
        h2 ^= ch + i;
        h2 = Math.imul(h2, 0x85ebca6b);
    }
    return 'fallback_' + (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

function getRegisteredAccounts() {
    try {
        const a = JSON.parse(localStorage.getItem('smartStudentAccounts') || '[]');
        return Array.isArray(a) ? a : [];
    } catch (_) {
        return [];
    }
}

function saveRegisteredAccounts(a) {
    try {
        localStorage.setItem('smartStudentAccounts', JSON.stringify(Array.isArray(a) ? a : []));
    } catch (_) {}
}

async function generateUniqueAccountId(existingAccounts = []) {
    const usedIds = new Set((Array.isArray(existingAccounts) ? existingAccounts : []).map(acc => String(acc.id || '').trim()));
    let candidate = '';
    let guard = 0;
    do {
        candidate = '#' + Math.floor(1000 + Math.random() * 9000);
        guard++;
    } while (usedIds.has(candidate) && guard < 9000);
    return candidate;
}

async function handleAuth(e, type) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    try {
        const accounts = getRegisteredAccounts();
        if (type === 'register') {
            const username = (document.getElementById('regUsername')?.value || '').trim();
            const email = (document.getElementById('regEmail')?.value || '').trim().toLowerCase();
            const pass = document.getElementById('regPass')?.value || '';
            const confirmPass = document.getElementById('regPassConfirm')?.value || '';

            if (!email || !pass) {
                notifyAuthMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور', true);
                return;
            }
            if (pass.length < 4) {
                notifyAuthMessage('يجب أن تتكون كلمة المرور من 4 أحرف على الأقل', true);
                return;
            }
            if (pass !== confirmPass) {
                notifyAuthMessage('كلمتا المرور غير متطابقتين!', true);
                return;
            }
            if (accounts.some(acc => String(acc.email || '').trim().toLowerCase() === email)) {
                notifyAuthMessage('هذا البريد مسجّل مسبقاً، يمكنك تسجيل الدخول مباشرة', true);
                return;
            }

            const passHash = await safeHashPassword(pass);
            const genderChoice = (typeof selectedGender !== 'undefined' && selectedGender) ? selectedGender : 'male';
            const newAccount = {
                id: await generateUniqueAccountId(accounts),
                username: username || email.split('@')[0] || 'طالب',
                email,
                passwordHash: passHash,
                gender: genderChoice
            };
            accounts.push(newAccount);
            saveRegisteredAccounts(accounts);

            window.currentUser = {
                id: newAccount.id,
                username: newAccount.username,
                email: newAccount.email,
                gender: newAccount.gender
            };
            if (typeof currentUser !== 'undefined') {
                currentUser = window.currentUser;
            }
            try {
                localStorage.setItem('smartStudentUser', JSON.stringify(window.currentUser));
            } catch (_) {}

            enterApp();
            notifyAuthMessage('تم إنشاء الحساب وتسجيل الدخول بنجاح! 🎉');
            return;
        }

        const email = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
        const pass = document.getElementById('loginPass')?.value || '';
        if (!email || !pass) {
            notifyAuthMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور', true);
            return;
        }

        const matched = accounts.find(acc => String(acc.email || '').trim().toLowerCase() === email);
        if (!matched) {
            notifyAuthMessage('لا يوجد حساب بهذا البريد، أنشئ حساباً جديداً أولاً', true);
            return;
        }

        const enteredHash = await safeHashPassword(pass);
        const isValidPass = matched.passwordHash
            ? matched.passwordHash === enteredHash
            : (matched.password && matched.password === pass);

        if (!isValidPass) {
            notifyAuthMessage('كلمة المرور غير صحيحة!', true);
            return;
        }

        window.currentUser = {
            id: matched.id || ('#' + Math.floor(1000 + Math.random() * 9000)),
            username: matched.username || email.split('@')[0] || 'طالب',
            email: matched.email,
            gender: matched.gender || 'male'
        };
        if (typeof currentUser !== 'undefined') {
            currentUser = window.currentUser;
        }
        try {
            localStorage.setItem('smartStudentUser', JSON.stringify(window.currentUser));
        } catch (_) {}

        enterApp();
        notifyAuthMessage('مرحباً بعودتك ' + window.currentUser.username);
    } catch (err) {
        console.error('Auth error:', err);
        notifyAuthMessage('حدث خطأ أثناء تسجيل الدخول: ' + (err && err.message ? err.message : 'حاول مرة أخرى'), true);
    }
}

function enterApp() {
    const userObj = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : (window.currentUser || { id: '#1001', username: 'طالب', email: '', gender: 'male' });
    const authScreen = document.getElementById('authScreen');
    const appScreen = document.getElementById('appScreen');
    if (authScreen) authScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');

    setGender(userObj.gender || 'male');
    const navAvatar = document.getElementById('navAvatar');
    const navUsername = document.getElementById('navUsername');
    const navIdentity = document.getElementById('navUserIdentityId');
    if (navAvatar) navAvatar.textContent = userObj.gender === 'female' ? '👩‍🎓' : '👨‍🎓';
    if (navUsername) navUsername.textContent = userObj.username;
    if (navIdentity) navIdentity.textContent = 'ID: ' + userObj.id;

    const safeCalls = [
        () => { if (typeof checkUrlInviteParams === 'function') checkUrlInviteParams(); },
        () => { if (typeof initWorkspaceData === 'function') initWorkspaceData(); },
        () => { if (typeof initStudentWelcomeBanner === 'function') initStudentWelcomeBanner(); },
        () => { if (typeof initRealtimeBridge === 'function') initRealtimeBridge(); },
        () => { if (typeof initAiAssistant === 'function') initAiAssistant(); },
        () => { if (typeof updateAiLibrariesBadge === 'function') updateAiLibrariesBadge(); },
        () => { if (typeof resetAutoLockTimer === 'function') resetAutoLockTimer(); },
        () => { if (typeof restoreLastNavigation === 'function') restoreLastNavigation(); },
        () => { if (typeof initFloatingBotWatcher === 'function') initFloatingBotWatcher(); },
        () => { if (typeof window.Chart !== 'undefined' && typeof drawGraph === 'function') drawGraph(); }
    ];

    safeCalls.forEach(fn => {
        try { fn(); } catch (err) { console.warn('Non-blocking init warning:', err); }
    });

    try { sessionStorage.removeItem('smartStudentScreenLocked'); } catch (_) {}
}

function logout() {
    try { if (typeof clearBattleTimers === 'function') clearBattleTimers(); } catch (_) {}
    try { if (typeof autoLockTimerId !== 'undefined') clearTimeout(autoLockTimerId); } catch (_) {}
    try { if (typeof invitePollTimerId !== 'undefined') clearInterval(invitePollTimerId); } catch (_) {}
    try { if (typeof projectsPollTimerId !== 'undefined') clearInterval(projectsPollTimerId); } catch (_) {}
    if (typeof screenLocked !== 'undefined') screenLocked = false;
    try { sessionStorage.removeItem('smartStudentScreenLocked'); } catch (_) {}

    const lockOverlay = document.getElementById('screenLockOverlay');
    if (lockOverlay) lockOverlay.classList.add('hidden');

    window.currentUser = null;
    if (typeof currentUser !== 'undefined') currentUser = null;
    try { localStorage.removeItem('smartStudentUser'); } catch (_) {}

    const loginPass = document.getElementById('loginPass');
    if (loginPass) loginPass.value = '';
    const appScreen = document.getElementById('appScreen');
    const authScreen = document.getElementById('authScreen');
    if (appScreen) appScreen.classList.add('hidden');
    if (authScreen) authScreen.classList.remove('hidden');

    toggleAuthMode('login');
    notifyAuthMessage('تم تسجيل الخروج');
}

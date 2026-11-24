        /* ==================== لغة ومظهر ودخول ==================== */
        function toggleLangMenu() { document.getElementById('langMenu').classList.toggle('show'); }
        function changeLanguage(lang) {
            currentLang = lang; const t = i18n[lang], root = document.getElementById('htmlRoot');
            root.setAttribute('lang', lang); root.setAttribute('dir', t.dir);
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active-lang'));
            const ab = document.getElementById('lang' + lang.charAt(0).toUpperCase() + lang.slice(1)); if (ab) ab.classList.add('active-lang');
            Object.keys(t).forEach(k => { if (k !== 'dir') { const el = document.getElementById(k); if (el) el.textContent = t[k]; } });
            document.getElementById('langMenu').classList.remove('show');
        }
        function setGender(gender) {
            selectedGender = gender; const bm = document.getElementById('regBtnMale'), bf = document.getElementById('regBtnFemale');
            if (gender === 'female') { document.body.classList.add('female-theme'); bf.classList.add('active-female'); bm.classList.remove('active-male'); document.getElementById('logoIcon').textContent = '👩‍🎓'; }
            else { document.body.classList.remove('female-theme'); bm.classList.add('active-male'); bf.classList.remove('active-female'); document.getElementById('logoIcon').textContent = '👨‍🎓'; }
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
        function getRegisteredAccounts() { const a = JSON.parse(localStorage.getItem('smartStudentAccounts') || '[]'); return Array.isArray(a) ? a : []; }
        function saveRegisteredAccounts(a) { localStorage.setItem('smartStudentAccounts', JSON.stringify(a)); }
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
                        showToast('يرجى إدخال البريد الإلكتروني وكلمة المرور', true);
                        return;
                    }
                    if (pass.length < 4) {
                        showToast('يجب أن تتكون كلمة المرور من 4 أحرف على الأقل', true);
                        return;
                    }
                    if (pass !== confirmPass) {
                        showToast('كلمتا المرور غير متطابقتين!', true);
                        return;
                    }
                    if (accounts.some(acc => acc.email === email)) {
                        showToast('هذا البريد مسجّل مسبقاً، يمكنك تسجيل الدخول مباشرة', true);
                        return;
                    }

                    const passHash = await hashSecretValue(pass);
                    const newAccount = {
                        id: await generateUniqueAccountId(accounts),
                        username: username || email.split('@')[0] || 'طالب',
                        email,
                        passwordHash: passHash,
                        gender: selectedGender
                    };
                    accounts.push(newAccount);
                    saveRegisteredAccounts(accounts);
                    currentUser = {
                        id: newAccount.id,
                        username: newAccount.username,
                        email: newAccount.email,
                        gender: newAccount.gender
                    };
                    localStorage.setItem('smartStudentUser', JSON.stringify(currentUser));
                    enterApp();
                    showToast('تم إنشاء الحساب وتسجيل الدخول بنجاح! 🎉');
                    return;
                }

                const email = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
                const pass = document.getElementById('loginPass')?.value || '';
                if (!email || !pass) {
                    showToast('يرجى إدخال البريد الإلكتروني وكلمة المرور', true);
                    return;
                }

                const matched = accounts.find(acc => String(acc.email || '').trim().toLowerCase() === email);
                if (!matched) {
                    showToast('لا يوجد حساب بهذا البريد، أنشئ حساباً جديداً أولاً', true);
                    return;
                }

                const enteredHash = await hashSecretValue(pass);
                const isValidPass = matched.passwordHash
                    ? matched.passwordHash === enteredHash
                    : (matched.password && matched.password === pass);

                if (!isValidPass) {
                    showToast('كلمة المرور غير صحيحة!', true);
                    return;
                }

                currentUser = {
                    id: matched.id || ('#' + Math.floor(1000 + Math.random() * 9000)),
                    username: matched.username || email.split('@')[0] || 'طالب',
                    email: matched.email,
                    gender: matched.gender || 'male'
                };
                localStorage.setItem('smartStudentUser', JSON.stringify(currentUser));
                enterApp();
                showToast('مرحباً بعودتك ' + currentUser.username);
            } catch (err) {
                console.error('Auth error:', err);
                showToast('حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى', true);
            }
        }
        function enterApp() {
            const authScreen = document.getElementById('authScreen');
            const appScreen = document.getElementById('appScreen');
            if (authScreen) authScreen.classList.add('hidden');
            if (appScreen) appScreen.classList.remove('hidden');

            setGender(currentUser.gender || 'male');
            const navAvatar = document.getElementById('navAvatar');
            const navUsername = document.getElementById('navUsername');
            const navIdentity = document.getElementById('navUserIdentityId');
            if (navAvatar) navAvatar.textContent = currentUser.gender === 'female' ? '👩‍🎓' : '👨‍🎓';
            if (navUsername) navUsername.textContent = currentUser.username;
            if (navIdentity) navIdentity.textContent = 'ID: ' + currentUser.id;

            checkUrlInviteParams();
            initWorkspaceData();
            initStudentWelcomeBanner();
            initRealtimeBridge();
            updateAiLibrariesBadge();
            resetAutoLockTimer();
            restoreLastNavigation();
            initFloatingBotWatcher();
            if (typeof window.Chart !== 'undefined') {
                try { drawGraph(); } catch (e) {}
            }
            sessionStorage.removeItem('smartStudentScreenLocked');
        }
        function logout() {
            clearBattleTimers(); clearTimeout(autoLockTimerId); clearInterval(invitePollTimerId); clearInterval(projectsPollTimerId); screenLocked = false; sessionStorage.removeItem('smartStudentScreenLocked');
            document.getElementById('screenLockOverlay')?.classList.add('hidden'); currentUser = null; localStorage.removeItem('smartStudentUser');
            document.getElementById('loginPass').value = ''; document.getElementById('appScreen').classList.add('hidden'); document.getElementById('authScreen').classList.remove('hidden');
            toggleAuthMode('login'); showToast('تم تسجيل الخروج');
        }

/* ==========================================================================
   firebase-auth.js
   Real sign-in with Firebase Authentication (email + password).
   - Registration creates the Auth account, a public profile, and a unique
     student ID that is reserved in studentIndex (first come, first served).
   - Sign-in / sign-out and session restore are handled here.
   - Loaded LAST (after every other script) so these handlers take priority.

   Step 1 of the security plan: identity is now a real account (auth.uid).
   Existing features still use the numeric student ID for lookups (see
   SECURITY.md, section 2, for the next migration step).
   ========================================================================== */
(function () {
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyCibfAnFN0BACS9-OKf5wmals4KpKc_FKY",
        authDomain: "smart-student-platform-f6eaf.firebaseapp.com",
        databaseURL: "https://smart-student-platform-f6eaf-default-rtdb.firebaseio.com",
        projectId: "smart-student-platform-f6eaf",
        storageBucket: "smart-student-platform-f6eaf.firebasestorage.app",
        messagingSenderId: "112366788977",
        appId: "1:112366788977:web:9e3e00e2c53f6d3e4a96d0"
    };

    const ERRORS = {
        'auth/invalid-email': 'البريد الإلكتروني غير صالح',
        'auth/email-already-in-use': 'هذا البريد مسجّل مسبقاً',
        'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)',
        'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
        'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً',
        'auth/network-request-failed': 'تحقق من الاتصال بالإنترنت',
        'auth/operation-not-allowed': 'تسجيل البريد غير مفعّل في Firebase Console'
    };
    const toMessage = (err) => ERRORS[err && err.code] || ('تعذر تسجيل الدخول: ' + (err && err.message ? err.message : 'خطأ غير معروف'));

    function ready() {
        if (typeof firebase === 'undefined' || !firebase.auth) return false;
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        return true;
    }

    function toast(msg) {
        if (typeof showToast === 'function') showToast(msg);
        else console.log('[auth]', msg);
    }

    function setBusy(busy) {
        ['btnLoginBtn', 'btnRegisterBtn'].forEach(id => {
            const b = document.getElementById(id);
            if (b) b.disabled = busy;
        });
    }

    function showApp(on) {
        document.getElementById('authScreen')?.classList.toggle('hidden', on);
        document.getElementById('appScreen')?.classList.toggle('hidden', !on);
    }

    // Random 6-digit student ID; reserved atomically in studentIndex.
    async function reserveStudentId(uid, db) {
        for (let attempt = 0; attempt < 8; attempt++) {
            const candidate = String(100000 + Math.floor(Math.random() * 900000));
            const ref = db.ref('studentIndex/' + candidate);
            const snap = await ref.get();
            if (snap.exists()) continue;
            try {
                await ref.set(uid);
                return candidate;
            } catch (_) { /* taken in the meantime, try again */ }
        }
        throw new Error('تعذر حجز رقم طالب، حاول مرة أخرى');
    }

    async function register(username, email, password, gender) {
        const auth = firebase.auth();
        const db = firebase.database();
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const uid = cred.user.uid;
        try {
            await cred.user.updateProfile({ displayName: username });
            const studentId = await reserveStudentId(uid, db);
            const profile = { username, studentId, gender, online: true, createdAt: firebase.database.ServerValue.TIMESTAMP };
            await db.ref('publicProfiles/' + uid).set({ username, studentId, online: true });
            await db.ref('users/' + uid).set(profile);
            return { uid, studentId };
        } catch (err) {
            // Do not leave a half-created account behind.
            try { await cred.user.delete(); } catch (_) {}
            throw err;
        }
    }

    // Keep the rest of the app working: it reads currentUser.id / .username.
    let registering = false;

    async function applySignedInUser(user) {
        if (registering) return; // profile is still being written
        if (!user) {
            window.currentUser = null;
            showApp(false);
            return;
        }
        let studentId = '';
        let username = user.displayName || user.email || 'طالب';
        let gender = 'male';
        try {
            const snap = await firebase.database().ref('users/' + user.uid).get();
            if (snap.exists()) {
                const v = snap.val() || {};
                studentId = String(v.studentId || '');
                username = v.username || username;
                gender = v.gender || gender;
            }
        } catch (_) {}
        if (!studentId) {
            // Fallback: the public profile also stores the 6-digit student ID.
            try {
                const p = await firebase.database().ref('publicProfiles/' + user.uid + '/studentId').get();
                if (p.exists()) studentId = String(p.val());
            } catch (_) {}
        }
        // Repair: the student ID must be a 6-digit ID reserved for THIS account in studentIndex.
        // Older accounts can carry a 4-digit or unreserved value; replace it with a valid one.
        try {
            const db = firebase.database();
            let reservedOk = false;
            if (/^\d{6}$/.test(studentId)) {
                const idx = await db.ref('studentIndex/' + studentId).get();
                reservedOk = idx.exists() && idx.val() === user.uid;
            }
            if (!reservedOk) {
                studentId = await reserveStudentId(user.uid, db);
                await db.ref('users/' + user.uid + '/studentId').set(studentId);
                await db.ref('publicProfiles/' + user.uid + '/studentId').set(studentId);
                toast('تم تحديث رقمك الدراسي إلى ' + studentId);
            }
        } catch (err) {
            console.error('[auth] student ID repair failed', err);
        }

        // Every legacy reader takes the ID from this key, so make it the account's real ID.
        // Without this, an old 4-digit value left in the browser keeps showing up.
        if (studentId) {
            try { localStorage.setItem('ssp_ff_player_id', studentId); } catch (_) {}
        } else {
            try { localStorage.removeItem('ssp_ff_player_id'); } catch (_) {}
            toast('تعذّر قراءة رقمك الدراسي، أعد تحميل الصفحة');
        }
        window.currentUser = { uid: user.uid, id: studentId, username, gender, email: user.email || '' };
        // The bot teacher is drawn as a man or a woman depending on the account's gender.
        document.body.dataset.gender = gender === 'female' ? 'female' : 'male';
        const nameEl = document.getElementById('navUsername');
        if (nameEl) nameEl.textContent = username;
        const idEl = document.getElementById('navUserIdentityId');
        if (idEl) idEl.textContent = 'ID: #' + (studentId || '—');
        showUidBox(user.uid);
        showApp(true);
        loadMainApp();
    }

    // Shows the account UID in the sidebar with a copy button (for the Firebase console).
    function showUidBox(uid) {
        const header = document.querySelector('.sidebar-header');
        if (!header) return;
        let box = document.getElementById('uidBox');
        if (!box) {
            box = document.createElement('div');
            box.id = 'uidBox';
            box.style.cssText = 'margin-top:8px; font-size:11px; color:#94a3b8; word-break:break-all;';
            const code = document.createElement('code');
            code.id = 'uidBoxCode';
            code.style.cssText = 'color:#fbbf24; user-select:all;';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = '📋 نسخ UID';
            btn.style.cssText = 'margin-inline-start:6px; font-size:11px; padding:2px 8px; border-radius:6px; border:1px solid var(--border); background:transparent; color:#e2e8f0; cursor:pointer;';
            btn.onclick = async () => {
                const v = document.getElementById('uidBoxCode')?.textContent || '';
                try { await navigator.clipboard.writeText(v); toast('تم نسخ UID ✅'); }
                catch (_) { toast('انسخ النص يدوياً: ' + v); }
            };
            box.append('UID: ', code, btn);
            header.appendChild(box);
        }
        const codeEl = document.getElementById('uidBoxCode');
        if (codeEl) codeEl.textContent = uid;
    }

    // ---- identity helpers used across the app ----
    window.getCurrentUid = function getCurrentUid() {
        return (window.currentUser && window.currentUser.uid) || '';
    };

    // Student ID (what people type) -> Firebase Auth UID (what the database uses)
    window.resolveUidByStudentId = async function resolveUidByStudentId(studentId) {
        const sid = String(studentId || '').replace(/^#/, '').trim();
        if (!sid || !ready()) return null;
        try {
            const snap = await firebase.database().ref('studentIndex/' + sid).get();
            return snap.exists() ? String(snap.val()) : null;
        } catch (_) {
            return null;
        }
    };

    // The main app starts only after sign-in, so every listener gets a real UID.
    let appLoaded = false;
    function loadMainApp() {
        if (appLoaded) return;
        appLoaded = true;
        // app.js registers its startup code on DOMContentLoaded / load. Those events
        // have already fired by the time we load it, so run such callbacks right away.
        if (document.readyState !== 'loading') {
            const docAdd = document.addEventListener.bind(document);
            document.addEventListener = function (type, fn, opts) {
                if (type === 'DOMContentLoaded') {
                    setTimeout(() => { try { fn.call(document, new Event(type)); } catch (e) { console.error(e); } }, 0);
                    return;
                }
                return docAdd(type, fn, opts);
            };
        }
        if (document.readyState === 'complete') {
            const winAdd = window.addEventListener.bind(window);
            window.addEventListener = function (type, fn, opts) {
                if (type === 'load') {
                    setTimeout(() => { try { fn.call(window, new Event(type)); } catch (e) { console.error(e); } }, 0);
                    return;
                }
                return winAdd(type, fn, opts);
            };
        }
        const s = document.createElement('script');
        s.src = 'app.js';
        // The notes upgrade must load after app.js so it can replace the older handlers.
        s.onload = () => {
            const v2 = document.createElement('script');
            v2.src = 'note-editor-v2.js';
            document.body.appendChild(v2);
        };
        document.body.appendChild(s);
    }

    window.handleAuth = async function handleAuth(event, mode) {
        if (event && event.preventDefault) event.preventDefault();
        if (!ready()) { toast('خدمة الحسابات غير متاحة حالياً'); return; }

        setBusy(true);
        try {
            if (mode === 'register') {
                const username = String(document.getElementById('regUsername')?.value || '').trim().slice(0, 40);
                const email = String(document.getElementById('regEmail')?.value || '').trim();
                const pass = String(document.getElementById('regPass')?.value || '');
                const confirm = String(document.getElementById('regPassConfirm')?.value || '');
                if (!username) { toast('أدخل اسم المستخدم'); return; }
                if (pass !== confirm) { toast('كلمتا المرور غير متطابقتين'); return; }
                const femaleBtn = document.getElementById('regBtnFemale');
                const pickedFemale = !!(femaleBtn && (femaleBtn.classList.contains('active-female') || femaleBtn.classList.contains('active')))
                    || document.body.classList.contains('female-theme');
                const gender = pickedFemale ? 'female' : 'male';
                registering = true;
                try {
                    await register(username, email, pass, gender);
                } finally {
                    registering = false;
                }
                await applySignedInUser(firebase.auth().currentUser);
                toast('تم إنشاء الحساب بنجاح ✅');
            } else {
                const email = String(document.getElementById('loginEmail')?.value || '').trim();
                const pass = String(document.getElementById('loginPass')?.value || '');
                await firebase.auth().signInWithEmailAndPassword(email, pass);
            }
        } catch (err) {
            toast(toMessage(err));
        } finally {
            setBusy(false);
        }
    };

    window.logout = async function logout() {
        if (!ready()) return;
        try {
            const uid = firebase.auth().currentUser?.uid;
            if (uid) await firebase.database().ref('publicProfiles/' + uid + '/online').set(false).catch(() => {});
            await firebase.auth().signOut();
            // Reload so every listener from the previous session is dropped.
            window.location.reload();
        } catch (err) {
            toast(toMessage(err));
        }
    };

    if (ready()) {
        firebase.auth().onAuthStateChanged(applySignedInUser);
    }
})();

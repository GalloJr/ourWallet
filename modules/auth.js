import { auth, db, doc, getDoc, setDoc, onAuthStateChanged, signInWithPopup, signOut, provider } from '../firebase.js';

export function setupAuth(loginBtn, logoutBtn, appScreen, loginScreen, userNameDisplay, callback) {
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, provider);
            } catch (e) {
                console.error(e);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth);
        });
    }

    // Capturar referral ID da URL
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    if (refId) {
        localStorage.setItem('referredBy', refId);
        // Limpar URL para estética
        window.history.replaceState({}, document.title, "/");
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (loginScreen) {
                loginScreen.classList.add('hidden');
                loginScreen.classList.remove('flex');
            }
            if (appScreen) appScreen.classList.remove('hidden');
            if (userNameDisplay) userNameDisplay.textContent = user.displayName;
            document.getElementById('my-share-id').value = user.uid;

            callback(user);
        } else {
            if (loginScreen) {
                loginScreen.classList.remove('hidden');
                loginScreen.classList.add('block');
                loginScreen.classList.remove('flex');
            }
            if (appScreen) appScreen.classList.add('hidden');
            callback(null);
        }
    });
}

export async function configurarWallet(uid) {
    try {
        const userRef = doc(db, "users", uid);
        const userDoc = await getDoc(userRef);
        let activeId = uid;
        let isAdmin = false;

        if (userDoc.exists()) {
            const userData = userDoc.data();
            isAdmin = !!userData.isAdmin;
            if (userData.linkedWalletId) {
                activeId = userData.linkedWalletId;
                document.getElementById('family-status').classList.remove('hidden');
                document.getElementById('spouse-id').value = activeId;
            } else {
                document.getElementById('family-status').classList.add('hidden');
            }
        } else {
            // Se o documento não existe, cria um novo com 30 dias de trial
            try {
                const trialDays = 30;
                const trialUntil = new Date();
                trialUntil.setDate(trialUntil.getDate() + trialDays);

                const referredBy = localStorage.getItem('referredBy');

                await setDoc(userRef, {
                    displayName: auth.currentUser.displayName,
                    email: auth.currentUser.email,
                    isAdmin: false,
                    isPremium: false,
                    trialUntil: trialUntil,
                    referredBy: referredBy || null,
                    createdAt: new Date()
                });

                // Se foi indicado, registrar a indicação. 
                // Nota: O bônus automático pro indicador via client-side pode ser bloqueado por segurança.
                // Aqui tentamos atualizar apenas se as regras permitirem, mas capturamos erro para não quebrar o login.
                if (referredBy) {
                    try {
                        const referrerRef = doc(db, "users", referredBy);
                        const referrerDoc = await getDoc(referrerRef);
                        if (referrerDoc.exists()) {
                            const rData = referrerDoc.data();
                            let currentTrial = rData.trialUntil ? rData.trialUntil.toDate() : new Date();
                            if (currentTrial < new Date()) currentTrial = new Date();

                            currentTrial.setDate(currentTrial.getDate() + 30);
                            // Esta escrita pode falhar se as regras de segurança forem restritas, 
                            // o que é o esperado para proteção de dados de terceiros.
                            await setDoc(referrerRef, { trialUntil: currentTrial }, { merge: true });
                        }
                    } catch (referralErr) {
                        console.warn("Não foi possível atribuir bônus ao indicador automaticamente (Segurança):", referralErr);
                    }
                    localStorage.removeItem('referredBy');
                }

                // Recarrega para que o sistema reconheça o novo documento criado
                window.location.reload();
            } catch (e) {
                console.warn("Não foi possível criar o documento do usuário:", e);
            }
        }

        // Busca o status premium do DONO da carteira ativa
        const walletOwnerRef = doc(db, "users", activeId);
        const walletOwnerDoc = await getDoc(walletOwnerRef);
        let isPremium = false;
        let trialDays = 0;

        if (walletOwnerDoc.exists()) {
            const data = walletOwnerDoc.data();
            const now = new Date();
            const trialUntil = data.trialUntil ? data.trialUntil.toDate() : null;
            const isPremiumByTrial = trialUntil && trialUntil > now;

            isPremium = !!data.isPremium || isPremiumByTrial;

            if (isPremiumByTrial && !data.isPremium) {
                const diffTime = Math.abs(trialUntil - now);
                trialDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }

        return { activeWalletId: activeId, isPremium, isAdmin, trialDays };
    } catch (e) {
        console.error("Erro ao configurar wallet:", e);
        return { activeWalletId: uid, isPremium: false, isAdmin: false, trialDays: 0 };
    }
}

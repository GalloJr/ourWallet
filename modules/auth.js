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
                loginScreen.classList.add('flex');
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
            // Se o documento não existe, cria um básico para que ele apareça no console
            try {
                await setDoc(userRef, {
                    displayName: auth.currentUser.displayName,
                    email: auth.currentUser.email,
                    isAdmin: false,
                    isPremium: false,
                    createdAt: new Date()
                });
                // Recarrega para que o sistema reconheça o novo documento criado
                window.location.reload();
            } catch (e) {
                console.warn("Não foi possível criar o documento do usuário:", e);
            }
        }

        // Busca o status premium do DONO da carteira ativa
        const walletOwnerRef = doc(db, "users", activeId);
        const walletOwnerDoc = await getDoc(walletOwnerRef);
        const isPremium = walletOwnerDoc.exists() ? !!walletOwnerDoc.data().isPremium : false;

        return { activeWalletId: activeId, isPremium, isAdmin };
    } catch (e) {
        console.error("Erro ao configurar wallet:", e);
        return { activeWalletId: uid, isPremium: false, isAdmin: false };
    }
}

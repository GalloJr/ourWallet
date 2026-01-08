import { auth, db, doc, getDoc, onAuthStateChanged, signInWithPopup, signOut, provider } from '../firebase.js';

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

        if (userDoc.exists() && userDoc.data().linkedWalletId) {
            const linkedId = userDoc.data().linkedWalletId;
            document.getElementById('family-status').classList.remove('hidden');
            document.getElementById('spouse-id').value = linkedId;
            return linkedId;
        } else {
            document.getElementById('family-status').classList.add('hidden');
            return uid;
        }
    } catch (e) {
        console.error("Erro ao configurar wallet:", e);
        return uid;
    }
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, getDoc, setDoc, runTransaction, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";
import { getPerformance } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-performance.js";

// IMPORTANTE: Credenciais movidas para variáveis de ambiente
// Crie um arquivo .env baseado no .env.example e preencha com suas credenciais
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Inicializar App Check com reCAPTCHA v3
// IMPORTANTE: A chave abaixo é pública e pode estar no código
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || '6LeIzkssAAAAAE9_Cprw4iBiXhInpfiWBG-7uJW-'),
  isTokenAutoRefreshEnabled: true
});

// Inicializar Performance Monitoring
const performance = getPerformance(app);

// Para desenvolvimento local, use:
// self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; (no navegador)

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

export { auth, db, storage, provider, ref, uploadBytes, getDownloadURL, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, getDoc, setDoc, runTransaction, increment };
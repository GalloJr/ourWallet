import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, getDoc, getDocs, setDoc, runTransaction, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";
import { getPerformance } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-performance.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { firebaseConfig, recaptchaSiteKey } from "./firebase.config.js";

// IMPORTANTE: Credenciais carregadas de firebase.config.js
// O arquivo firebase.config.js é gerado durante o build a partir do .env
const app = initializeApp(firebaseConfig);

// Inicializar App Check com reCAPTCHA v3 (apenas em produção)
// IMPORTANTE: A chave site key é pública e vem do firebase.config.js
let appCheck;
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (!isLocalhost && recaptchaSiteKey) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
    console.log('✅ App Check inicializado');
  } catch (error) {
    console.warn('⚠️ Erro ao inicializar App Check (não crítico):', error.message);
  }
} else {
  console.log('⚠️ App Check desabilitado em localhost');
  // Em desenvolvimento local, usar debug token
  if (typeof self !== 'undefined') {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
}

// Inicializar Performance Monitoring
const performance = getPerformance(app);

// Para desenvolvimento local, use:
// self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; (no navegador)

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);
const provider = new GoogleAuthProvider();

export { auth, db, storage, functions, provider, ref, uploadBytes, getDownloadURL, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, collection, addDoc, query, where, onSnapshot, orderBy, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc, runTransaction, increment, httpsCallable };
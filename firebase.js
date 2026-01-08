import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhLGUK3w4iwWnze0FEvA46z4VCv86CFHg",
  authDomain: "our-wallet-14998929-dc6cf.firebaseapp.com",
  projectId: "our-wallet-14998929-dc6cf",
  storageBucket: "our-wallet-14998929-dc6cf.firebasestorage.app",
  messagingSenderId: "299926540612",
  appId: "1:299926540612:web:54b119cbcd54c6d5fdc711"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

export { auth, db, storage, provider, ref, uploadBytes, getDownloadURL, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc, getDoc, setDoc };
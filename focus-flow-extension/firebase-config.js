import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithCredential, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, addDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCbpK1LrYnZZovHuHgnyjN_VkW_CHbW1yA",
  authDomain: "focus-flow-7e11e.firebaseapp.com",
  projectId: "focus-flow-7e11e",
  storageBucket: "focus-flow-7e11e.firebasestorage.app",
  messagingSenderId: "713595575747",
  appId: "1:713595575747:web:3fe6dccf32cb231adf7176",
  measurementId: "G-YW3Z6LR281"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithCredential, signOut, onAuthStateChanged, doc, getDoc, setDoc, addDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp };

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQtbmiwmxFv-sPVpZdgg4bp-Mi532ZY2o",
  authDomain: "friend-shoes.firebaseapp.com",
  databaseURL: "https://friend-shoes-default-rtdb.firebaseio.com",
  projectId: "friend-shoes",
  storageBucket: "friend-shoes.firebasestorage.app",
  messagingSenderId: "633257885783",
  appId: "1:633257885783:web:5b17e5108c6d30baa1a312",
  measurementId: "G-WJV0NFBEC8"
};
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  auth,
  db,
  storage,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
};

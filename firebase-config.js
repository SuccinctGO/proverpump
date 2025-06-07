import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyAPyMRaZsuW-3glkOiSm4rLwlLYvoyZI2Y",
    authDomain: "prover-pump.firebaseapp.com",
    projectId: "prover-pump",
    storageBucket: "prover-pump.firebasestorage.app",
    messagingSenderId: "960428808146",
    appId: "G-WPYG0EFLGY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
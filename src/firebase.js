import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  projectId: "todo-app-2026-kr-v1",
  appId: "1:721044088109:web:d8c1b8aeacd5e544a21fa4",
  storageBucket: "todo-app-2026-kr-v1.firebasestorage.app",
  apiKey: "AIzaSyDXnoMzHJw7hGmeT5A-lHLFxfNQ7o-t3hs",
  authDomain: "todo-app-2026-kr-v1.firebaseapp.com",
  messagingSenderId: "721044088109"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBXcWOjS50NNsrDQTaGpsQD9K5gb647CO8",
  authDomain: "anniversary-surprisewed.firebaseapp.com",
  projectId: "anniversary-surprisewed",
  storageBucket: "anniversary-surprisewed.firebasestorage.app",
  messagingSenderId: "796437321988",
  appId: "1:796437321988:web:5fd0bde871f53a24369851",
  measurementId: "G-028FJ9Y9HY"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
import {
  initializeApp
} from "firebase/app";

import {
  getAuth
} from "firebase/auth";

import {
  getFirestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    "AIzaSyBGayNeSizS2ro5SnRGvfXxZh9Qj55v00k",

  authDomain:
    "backend-91067.firebaseapp.com",

  projectId:
    "backend-91067",

  messagingSenderId:
    "887032571174",

  appId:
    "1:887032571174:web:a58dde14fb1c8ad3d54de7",

  measurementId:
    "G-EQZRYW1DNH"
};

const app =
  initializeApp(
    firebaseConfig
  );

export const auth =
  getAuth(app);

export const db =
  getFirestore(app);
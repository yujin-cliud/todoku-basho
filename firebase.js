// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔐 ゆうじの Firebase 設定（すでに取得済みのやつ）
const firebaseConfig = {
  apiKey: "AIzaSyB4e1nm-ZktpfSMPVW-umIiw6WQmxs0sqg",
  authDomain: "todoku-basho.firebaseapp.com",
  projectId: "todoku-basho",
  storageBucket: "todoku-basho.appspot.com", // ←修正したよ！
  messagingSenderId: "395140717821",
  appId: "1:395140717821:web:b68a7dce7e5b6f3eb7b294"
};

// Firebase初期化 & Firestore取得
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

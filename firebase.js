// ✅ Firebase CDNモジュールをインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ✅ Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyB4e1nm-ZktpfSMPVW-umIiw6WQmxs0sqg",
  authDomain: "todoku-basho.firebaseapp.com",
  projectId: "todoku-basho",
  storageBucket: "todoku-basho.appspot.com",
  messagingSenderId: "395140717821",
  appId: "1:395140717821:web:b68a7dce7e5b6f3eb7b294"
};

// ✅ アプリ初期化（←これがなかった！）
const app = initializeApp(firebaseConfig);

// ✅ FirestoreとAuthの取得
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ 関数をwindowに展開（script.jsで使えるように）
window.db = db;
window.collection = collection;
window.addDoc = addDoc;
window.getDocs = getDocs;
window.deleteDoc = deleteDoc;
window.doc = doc;
window.updateDoc = updateDoc;

window.auth = auth;
window.signInAnonymously = signInAnonymously;
window.onAuthStateChanged = onAuthStateChanged;
window.initializeApp = initializeApp;
window.getAuth = getAuth;

// ✅ 匿名ログインの設定
signInAnonymously(auth)
  .then(() => {
    console.log("匿名ログイン成功");
  })
  .catch((error) => {
    console.error("ログイン失敗:", error);
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.currentUser = user;
    console.log("ログイン成功：", user.uid);
  }
});

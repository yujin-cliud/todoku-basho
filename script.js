// Firebase SDKから必要な機能をインポート
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";

// Firebase構成オブジェクト
const firebaseConfig = {
  apiKey: "AIzaSyB4e1nm-ZktpfSMPVW-umIiw6WQmxs0sqg",
  authDomain: "todoku-basho.firebaseapp.com",
  projectId: "todoku-basho",
  storageBucket: "todoku-basho.firebasestorage.app",
  messagingSenderId: "395140717821",
  appId: "1:395140717821:web:b68a7dce7e5b6f3eb7b294"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 投稿データ配列と表示インデックス
let diaryData = [];
let currentIndex = 0;

// ✅ 投稿処理
document.getElementById('submit').addEventListener('click', async () => {
  const name = document.getElementById('username').value.trim() || "匿名さん";
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();

  if (!title || !content) {
    alert("タイトルと本文を入力してね！");
    return;
  }

  const date = new Date().toLocaleString();
  const newEntry = { name, title, content, date };

  try {
    await addDoc(collection(db, "diaries"), newEntry);
    alert("投稿が保存されたよ！");
    loadEntries();
  } catch (e) {
    console.error("保存に失敗したよ:", e);
    alert("保存に失敗したよ…");
  }

  document.getElementById('username').value = '';
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
});

// ⬅ 前へ
document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentIndex < diaryData.length - 1) {
    currentIndex++;
    displayEntry();
  }
});

// ➡ 次へ
document.getElementById('nextBtn').addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    displayEntry();
  }
});

// 📖 表示処理
function displayEntry() {
  const container = document.getElementById('diary-container');
  container.innerHTML = "";

  if (!diaryData[currentIndex]) return;

  const entry = diaryData[currentIndex];

  container.innerHTML = `
    <div class="entry">
      <h3>${entry.title}</h3>
      <p>${entry.content}</p>
      <small>by ${entry.name} ｜ ${entry.date}</small>
      <button id="deleteBtn">この投稿を削除</button>
    </div>
  `;

  // 🗑 削除ボタン
  document.getElementById("deleteBtn").addEventListener("click", async () => {
    const ok = confirm("この投稿を削除しますか？");
    if (!ok) return;

    const id = entry.id;
    try {
      await deleteDoc(doc(db, "diaries", id));
      alert("削除したよ！");
      await loadEntries();
    } catch (e) {
      console.error("削除できなかった:", e);
      alert("削除できなかったよ…");
    }
  });
}

// 🔁 Firestore から投稿を取得して表示
async function loadEntries() {
  const q = query(collection(db, "diaries"), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  diaryData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  currentIndex = 0;
  displayEntry();
}

// 🔃 ページ読み込み時にFireStoreから取得
window.addEventListener('load', () => {
  loadEntries();
});

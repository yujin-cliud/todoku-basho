import { addDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const db = window.db;

let diaryData = [];
let currentIndex = 0;

// 起動時にFirestoreから取得
window.addEventListener("load", async () => {
  await loadEntries();
  displayEntry();
});

// 投稿処理
document.getElementById("diary-form").addEventListener("submit", async (e) => {
  e.preventDefault();

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
    await loadEntries();
    displayEntry();
  } catch (e) {
    console.error("保存に失敗したよ:", e);
    alert("保存に失敗したよ…");
  }

  document.getElementById('username').value = '';
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
});

// ページめくり
document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentIndex < diaryData.length - 1) {
    currentIndex++;
    displayEntry();
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    displayEntry();
  }
});

// データ取得
async function loadEntries() {
  diaryData = [];
  const querySnapshot = await getDocs(collection(db, "diaries"));
  querySnapshot.forEach((doc) => {
    diaryData.push(doc.data());
  });
  diaryData.sort((a, b) => new Date(b.date) - new Date(a.date));
  currentIndex = 0;
}

// 表示
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
    </div>
  `;
}

const db = window.db;

let diaryData = [];
let currentIndex = 0;

// 日付整形関数（例：2025年7月6日 18:23）
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${y}年${m}月${day}日 ${h}:${min}`;
}

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

  const date = new Date().toISOString(); // 保存はISO形式で統一
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
  querySnapshot.forEach((docSnap) => {
    diaryData.push({ ...docSnap.data(), id: docSnap.id });
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
      <small>by ${entry.name} ｜ ${formatDate(entry.date)}</small><br />
      <button id="deleteBtn">この投稿を削除</button>
    </div>
  `;

  // 削除機能
  document.getElementById("deleteBtn").addEventListener("click", async () => {
    const ok = confirm("この投稿を削除しますか？");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "diaries", entry.id));
      alert("削除したよ！");
      await loadEntries();
      displayEntry();
    } catch (e) {
      console.error("削除に失敗:", e);
      alert("削除できなかったよ…");
    }
  });
}

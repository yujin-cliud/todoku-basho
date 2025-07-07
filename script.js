// firebase の関数を window から取得
const db = window.db;
const collection = window.collection;
const addDoc = window.addDoc;
const getDocs = window.getDocs;
const deleteDoc = window.deleteDoc;
const doc = window.doc;

let diaryData = [];
let currentIndex = 0;

// 投稿処理
document.getElementById("diary-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("username").value.trim() || "匿名";
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (!title || !content) {
    alert("タイトルと内容を入力してね！");
    return;
  }

  const date = new Date().toISOString(); // データはISO形式で保存

  try {
    await addDoc(collection(db, "diaries"), {
      name,
      title,
      content,
      date
    });
    alert("投稿が保存されたよ！");
    await loadEntries();
    displayEntry();
  } catch (error) {
    console.error("保存に失敗:", error);
    alert("保存できなかったよ…");
  }

  document.getElementById("username").value = "";
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
});

// 日記の読み込み
async function loadEntries() {
  diaryData = [];
  const querySnapshot = await getDocs(collection(db, "diaries"));
  querySnapshot.forEach((docSnap) => {
    diaryData.push({ ...docSnap.data(), id: docSnap.id });
  });
  diaryData.sort((a, b) => new Date(b.date) - new Date(a.date));
  currentIndex = 0;
}

// 表示処理
function displayEntry() {
  const container = document.getElementById("diary-container");
  container.innerHTML = "";

  if (!diaryData[currentIndex]) return;

  const entry = diaryData[currentIndex];
  const displayDate = formatDate(entry.date);

  container.innerHTML = `
    <div class="entry">
      <h3>${entry.title}</h3>
      <p>${entry.content}</p>
      <small>by ${entry.name} ｜ ${displayDate}</small><br />
      <button id="deleteBtn">この投稿を削除</button>
    </div>
  `;

  document.getElementById("deleteBtn").addEventListener("click", async () => {
    if (!confirm("この投稿を削除しますか？")) return;

    try {
      await deleteDoc(doc(db, "diaries", entry.id));
      alert("削除したよ！");
      await loadEntries();
      displayEntry();
    } catch (e) {
      console.error("削除失敗:", e);
      alert("削除できなかったよ…");
    }
  });
}

// 日付の整形
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

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

document.getElementById("loadBtn").addEventListener("click", async () => {
  await loadEntries();
  displayEntry();
});

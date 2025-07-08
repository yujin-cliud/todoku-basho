let diaryData = [];
let currentIndex = 0;

document.getElementById('diary-form').addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById('username').value.trim() || "匿名さん";
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();

  if (!title || !content) {
    alert("タイトルと本文を入力してね！");
    return;
  }

  const date = new Date().toISOString();
  const newEntry = { name, title, content, date };

  try {
    await window.addDoc(window.collection(window.db, "diaries"), newEntry);
    alert("投稿が保存されたよ！");
    await loadEntries();
    displayEntry();
  } catch (e) {
    console.error("保存に失敗:", e);
    alert("保存に失敗したよ…");
  }

  document.getElementById('diary-form').reset();
  autoGrow(document.getElementById("content"));
});

async function loadEntries() {
  diaryData = [];
  const querySnapshot = await window.getDocs(window.collection(window.db, "diaries"));
  querySnapshot.forEach((docSnap) => {
    diaryData.push({ ...docSnap.data(), id: docSnap.id });
  });

  diaryData.sort((a, b) => new Date(b.date) - new Date(a.date));
  currentIndex = 0;
  }

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function displayEntry() {
  const container = document.getElementById("diary-container");
  container.innerHTML = "";

  const entry = diaryData[currentIndex];
  if (!entry) return;

  container.innerHTML = `
    <div class="entry">
      <h3>${entry.title}</h3>
      <p>${entry.content}</p>
      <small>by ${entry.name} ｜ ${formatDate(entry.date)}</small><br />
      <button id="deleteBtn">この投稿を削除</button>
    </div>
  `;

  document.getElementById("deleteBtn").addEventListener("click", async () => {
    const ok = confirm("この投稿を削除する？");
    if (!ok) return;
    await window.deleteDoc(window.doc(window.db, "diaries", entry.id));
    alert("削除したよ！");
    await loadEntries();
    displayEntry();
  });
}

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

window.addEventListener("DOMContentLoaded", async () => {
  await loadEntries();
  displayEntry();
});

// textarea 高さ自動調整
const textarea = document.getElementById("content");
textarea.addEventListener("input", () => autoGrow(textarea));

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

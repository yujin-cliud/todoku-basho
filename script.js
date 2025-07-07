let diaryData = [];
let currentIndex = 0;

document.addEventListener("DOMContentLoaded", async () => {
  await loadEntries();
  displayEntry();
  updateCount();
});

document.getElementById("diary-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("username").value.trim() || "匿名さん";
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (!title || !content) {
    alert("タイトルと内容を入力してね！");
    return;
  }

  const date = new Date().toISOString();

  try {
    await window.addDoc(window.collection(window.db, "diaries"), {
      name,
      title,
      content,
      date,
    });

    document.getElementById("username").value = "";
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";

    await loadEntries();
    displayEntry();
    updateCount();
  } catch (err) {
    alert("投稿に失敗したよ…");
    console.error(err);
  }
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

function displayEntry() {
  const container = document.getElementById("diary-container");
  container.innerHTML = "";

  if (!diaryData[currentIndex]) return;

  const entry = diaryData[currentIndex];
  const date = new Date(entry.date);

  container.innerHTML = `
    <div class="entry">
      <h3>${entry.title}</h3>
      <p>${entry.content}</p>
      <p><small>by ${entry.name} ｜ ${formatDate(date)}</small></p>
      <button class="delete-btn">この投稿を削除</button>
    </div>
  `;

  document.querySelector(".delete-btn").addEventListener("click", async () => {
    const confirmDelete = confirm("この投稿を削除する？");
    if (!confirmDelete) return;

    try {
      await window.deleteDoc(window.doc(window.db, "diaries", entry.id));
      await loadEntries();
      displayEntry();
      updateCount();
    } catch (err) {
      alert("削除に失敗したよ…");
      console.error(err);
    }
  });
}

function updateCount() {
  document.getElementById("count").textContent = diaryData.length;
}

function formatDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
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

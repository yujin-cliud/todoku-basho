let diaryData = [];
let filteredData = [];
let currentIndex = 0;

document.getElementById('diary-form').addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById('username').value.trim() || "匿名さん";
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  const tagsInput = document.getElementById('tags');
  const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag !== "");

  if (!title || !content) {
    alert("タイトルと本文を入力してね！");
    return;
  }

  const date = new Date().toISOString();
  const newEntry = { name, title, content, tags, date, likes: 0 };

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
  filteredData = [...diaryData];
  currentIndex = 0;
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function displayEntry() {
  const container = document.getElementById("diary-container");
  container.innerHTML = "";

  const entry = filteredData[currentIndex];
  if (!entry) return;

  const likedKey = `liked_${entry.id}`;
  const alreadyLiked = localStorage.getItem(likedKey);

  container.innerHTML = `
    <div class="entry">
      <h3>${entry.title}</h3>
      <p>${entry.content}</p>
      <small>by ${entry.name} ｜ ${formatDate(entry.date)}</small><br />
      <p class="tags">タグ:
        ${(entry.tags || []).map(tag => `<span class="tag" data-tag="${tag}">#${tag}</span>`).join(" ")}
      </p>
      <button class="likeBtn" data-id="${entry.id}" ${alreadyLiked ? 'disabled' : ''}>
        ${alreadyLiked ? '💛 お気に入り済み' : '💛 お気に入り'}
      </button>
      <span class="likeCount">${entry.likes || 0}件のお気に入り</span><br/>
      <button id="deleteBtn">この投稿を削除</button>
    </div>
  `;

  // 削除
  document.getElementById("deleteBtn").addEventListener("click", async () => {
    const ok = confirm("この投稿を削除する？");
    if (!ok) return;
    await window.deleteDoc(window.doc(window.db, "diaries", entry.id));
    alert("削除したよ！");
    await loadEntries();
    displayEntry();
  });

  // お気に入り
  const likeBtn = document.querySelector(".likeBtn");
  if (!alreadyLiked && likeBtn) {
    likeBtn.addEventListener("click", async () => {
      const newLikes = (entry.likes || 0) + 1;
      await window.updateDoc(window.doc(window.db, "diaries", entry.id), { likes: newLikes });
      localStorage.setItem(likedKey, "true"); // 一回押した記録
      await loadEntries();
      displayEntry(); // 再描画で「お気に入り済み」に切り替え
    });
  }
}

// ページナビ
document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentIndex < filteredData.length - 1) {
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

// 検索
document.getElementById("searchBtn").addEventListener("click", () => {
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!keyword) {
    alert("検索ワードを入力してな！");
    return;
  }

  filteredData = diaryData.filter(entry => {
    const title = entry.title.toLowerCase();
    const content = entry.content.toLowerCase();
    const tags = (entry.tags || []).join(",").toLowerCase();
    return title.includes(keyword) || content.includes(keyword) || tags.includes(keyword);
  });

  currentIndex = 0;
  displayEntry();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  filteredData = [...diaryData];
  currentIndex = 0;
  document.getElementById("searchInput").value = "";
  displayEntry();
});

// タグクリックで検索バー反映
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("tag")) {
    const selectedTag = e.target.dataset.tag.toLowerCase();
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.value = selectedTag;
    }

    filteredData = diaryData.filter(entry =>
      (entry.tags || []).some(tag => tag.toLowerCase() === selectedTag)
    );

    currentIndex = 0;
    displayEntry();
  }
});

// 初期ロード
window.addEventListener("DOMContentLoaded", async () => {
  await loadEntries();
  displayEntry();
});

// textarea 自動調整
const textarea = document.getElementById("content");
textarea.addEventListener("input", () => autoGrow(textarea));

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

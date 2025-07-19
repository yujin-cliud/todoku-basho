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
    alert("タイトルと本文を入力してな！");
    return;
  }

  const date = new Date().toISOString();
  const uid = window.currentUser?.uid || null;

  const newEntry = { name, title, content, tags, date, likes: 0, uid };

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

  const isOwner = entry.uid === window.currentUser?.uid;

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
      ${isOwner ? `<button id="deleteBtn">この投稿を削除</button>` : ""}
    </div>
  `;

  if (isOwner) {
    document.getElementById("deleteBtn").addEventListener("click", async () => {
      const ok = confirm("この投稿を削除する？");
      if (!ok) return;
      await window.deleteDoc(window.doc(window.db, "diaries", entry.id));
      alert("削除したよ！");
      await loadEntries();
      displayEntry();
    });
  }

  // コメントセクション
  const commentSection = document.createElement("div");
  commentSection.classList.add("comment-section");
  commentSection.innerHTML = `
    <h4>コメント</h4>
    <div id="comment-list"></div>
    <input type="text" id="comment-name" placeholder="お名前（省略可）" class="comment-name-input" />
    <textarea id="comment-input" rows="2" placeholder="コメントを書く…" class="comment-textarea"></textarea>
    <button id="comment-submit" class="comment-submit-btn">コメント送信</button>
  `;
  container.appendChild(commentSection);

  document.getElementById("comment-submit").addEventListener("click", async () => {
    const name = document.getElementById("comment-name").value.trim() || "匿名さん";
    const commentText = document.getElementById("comment-input").value.trim();
    if (!commentText) return alert("コメントを入力してな");

    const commentData = {
      name,
      text: commentText,
      date: new Date().toISOString()
    };

    const commentRef = window.collection(window.db, "diaries", entry.id, "comments");
    await window.addDoc(commentRef, commentData);

    document.getElementById("comment-input").value = "";
    document.getElementById("comment-name").value = "";
    loadComments(entry.id);
  });

  loadComments(entry.id);
}

async function loadComments(entryId) {
  const commentList = document.getElementById("comment-list");
  commentList.innerHTML = "読み込み中…";

  const commentRef = window.collection(window.db, "diaries", entryId, "comments");
  const commentSnapshot = await window.getDocs(commentRef);

  const comments = [];
  commentSnapshot.forEach(doc => comments.push(doc.data()));

  commentList.innerHTML = comments.length
    ? comments.map(c => `<p style="margin: 4px 0;">🗨 <strong>${c.name || "匿名さん"}</strong>：${c.text} <small>（${formatDate(c.date)}）</small></p>`).join("")
    : "<p>コメントはまだありません</p>";
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

  const splash = document.getElementById("splash-screen");
  if (splash) {
    setTimeout(() => {
      splash.style.opacity = "0";
      setTimeout(() => {
        splash.style.display = "none";
      }, 1000);
    }, 1500);
  }
});

const textarea = document.getElementById("content");
textarea.addEventListener("input", () => autoGrow(textarea));

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

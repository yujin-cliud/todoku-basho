let diaryData = [];
let filteredData = [];
let currentIndex = 0;
let editingEntryId = null;

// 投稿フォーム送信
document.getElementById('diary-form').addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById('username').value.trim() || "匿名さん";
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t);
  const imageFile = document.getElementById('imageInput').files[0];
  const uid = window.currentUser?.uid || null;

  if (!title || !content) {
    alert("タイトルと本文を入力してな！");
    return;
  }

  let imageUrl = "";
  if (imageFile) {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("upload_preset", "todoku_upload");
    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dvzapaede/image/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      imageUrl = data.secure_url;
    } catch (err) {
      console.error("画像アップロード失敗:", err);
      alert("画像のアップロードに失敗したで…");
      return;
    }
  }

  const date = new Date().toISOString();
  const newEntry = { name, title, content, tags, date, likes: 0, uid, imageUrl };

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
  querySnapshot.forEach(doc => {
    diaryData.push({ ...doc.data(), id: doc.id });
  });
  diaryData.sort((a, b) => new Date(b.date) - new Date(a.date));
  filteredData = [...diaryData];
  currentIndex = 0;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function convertNewlinesToBr(text) {
  return text.replace(/\n/g, "<br>");
}

function createExpandableContent(text) {
  const wrapper = document.createElement("div");
  wrapper.className = "expandable-content";

  const p = document.createElement("p");
  p.innerHTML = convertNewlinesToBr(text);  // ← 改行に対応
  p.classList.add("collapsed");
  wrapper.appendChild(p);

  if (text.length > 100) {
    const btn = document.createElement("button");
    btn.className = "readmore-btn";
    btn.textContent = "続きを読む";
    btn.addEventListener("click", () => {
      p.classList.remove("collapsed");
      btn.remove();
    });
    wrapper.appendChild(btn);
  }

  return wrapper;
}

function displayEntry() {
  const container = document.getElementById("diary-container");
  container.innerHTML = "";
  const entry = filteredData[currentIndex];
  if (!entry) return;

  const isOwner = entry.uid === window.currentUser?.uid;
  const likedKey = `liked_${entry.id}`;
  const alreadyLiked = localStorage.getItem(likedKey);

  const entryHTML = document.createElement("div");
  entryHTML.className = "entry";
  entryHTML.innerHTML = `
    <h3>${entry.title}</h3>
    ${entry.imageUrl ? `<img src="${entry.imageUrl}" class="diary-image">` : ""}
    <small>by ${entry.name} ｜ ${formatDate(entry.date)}</small><br/>
    <p class="tags">
  タグ: ${(entry.tags || []).map(tag => `<span class="tag" data-tag="${tag}">#${tag}</span>`).join(" ")}
  <img src="./image/comment.png" alt="コメント" class="menu-icon comment-icon" data-id="${entry.id}" style="width: 24px; height: 24px; margin-left: 8px; cursor: pointer;" />
</p>

    <button class="likeBtn" data-id="${entry.id}" ${alreadyLiked ? "disabled" : ""}>
      ${alreadyLiked ? "💛 お気に入り済み" : "💛 お気に入り"}
    </button>
    <span class="likeCount">${entry.likes || 0}件のお気に入り</span><br/>
     `;

  const expandable = createExpandableContent(entry.content);
  entryHTML.insertBefore(expandable, entryHTML.querySelector("img, small, .tags"));

  container.appendChild(entryHTML);

  if (isOwner) {
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "この投稿を削除";
  deleteBtn.className = "delete-btn";
  deleteBtn.addEventListener("click", async () => {
    const ok = confirm("この投稿を削除する？");
    if (!ok) return;
    await window.deleteDoc(window.doc(window.db, "diaries", entry.id));
    await loadEntries();
    displayEntry();
  });
  entryHTML.appendChild(deleteBtn);

  const editBtn = document.createElement("button");
  editBtn.textContent = "編集";
  editBtn.className = "edit-btn"; // 必要なら "edit-btn" にしてもOK
  editBtn.addEventListener("click", () => {
    openEditModal(entry);
  });
  entryHTML.appendChild(editBtn);
}


// コメントアイコンのイベント追加（HTML側のアイコンを利用）
const commentIcon = entryHTML.querySelector(".comment-icon");
if (commentIcon) {
  commentIcon.addEventListener("click", () => {
    openCommentModal(entry.id);
  });
}

// コメント件数の表示用span作成
const commentCountSpan = document.createElement("span");
commentCountSpan.className = "comment-count";
commentCountSpan.textContent = "..."; // 読み込み中の仮表示

// Firestoreから件数取得して更新
const commentRef = window.collection(window.db, "diaries", entry.id, "comments");
window.getDocs(commentRef).then(snap => {
  commentCountSpan.textContent = snap.size;
});

// .tags に件数だけ追加（アイコンは既存のHTMLのを使う）
const tagsContainer = entryHTML.querySelector(".tags");
if (tagsContainer) {
  tagsContainer.appendChild(commentCountSpan);
}

  displayThumbnails();
}

async function loadComments(entryId) {
  const list = document.getElementById("comment-list");
  list.innerHTML = "読み込み中…";
  const ref = window.collection(window.db, "diaries", entryId, "comments");
  const snap = await window.getDocs(ref);

  const comments = [];
  snap.forEach(doc => comments.push(doc.data()));

  list.innerHTML = comments.length
    ? comments.map(c => `<p style="margin:4px 0;">🗨 <strong>${c.name}</strong>：${c.text} <small>（${formatDate(c.date)}）</small></p>`).join("")
    : "<p>コメントはまだありません</p>";
}

function displayThumbnails() {
  let bar = document.getElementById("thumbnail-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "thumbnail-bar";
    bar.className = "thumbnail-bar";
    document.body.appendChild(bar);
  }
  bar.innerHTML = "";

  filteredData.forEach((entry, index) => {
    const div = document.createElement("div");
    div.className = "thumbnail-item";
    let contentPreview = entry.content.replace(/\n/g, " ").slice(0, 30);
if (contentPreview.length === 30) contentPreview += "…";

div.innerHTML = entry.imageUrl
  ? `
    <img src="${entry.imageUrl}" class="thumbnail-image" />
    <div class="thumbnail-text">${entry.title}<br><small>${entry.name}</small></div>
  `
  : `
    <div class="thumbnail-text">
      <strong>${entry.title}</strong><br>
      ${contentPreview}<br>
      <small>${entry.name}</small>
    </div>
  `;

    div.addEventListener("click", () => {
      currentIndex = index;
      displayEntry();
    });
    bar.appendChild(div);
  });
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
function openEditModal(entry) {
  editingEntryId = entry.id;
  document.getElementById("editTitle").value = entry.title;
  document.getElementById("editContent").value = entry.content;
  document.getElementById("editTags").value = entry.tags?.join(", ") || "";
  document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
  editingEntryId = null;
  document.getElementById("editModal").style.display = "none";
}

// 検索
document.getElementById("searchBtn").addEventListener("click", () => {
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!keyword) return alert("検索ワードを入力してな！");
  filteredData = diaryData.filter(e =>
    e.title.toLowerCase().includes(keyword) ||
    e.content.toLowerCase().includes(keyword) ||
    (e.tags || []).join(",").toLowerCase().includes(keyword)
  );
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
    const tag = e.target.dataset.tag.toLowerCase();
    document.getElementById("searchInput").value = tag;
    filteredData = diaryData.filter(e => (e.tags || []).some(t => t.toLowerCase() === tag));
    currentIndex = 0;
    displayEntry();
  }
});

// 初期化（スプラッシュ付き）
window.addEventListener("load", async () => {
  await loadEntries();
  displayEntry();

  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.transition = "opacity 1s ease";
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.style.display = "none";
    }, 1000);
  }
});

// textarea 自動リサイズ
const textarea = document.getElementById("content");
if (textarea) {
  textarea.addEventListener("input", () => autoGrow(textarea));
}

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
document.getElementById("saveEditBtn").addEventListener("click", async () => {
  const updatedTitle = document.getElementById("editTitle").value;
  const updatedContent = document.getElementById("editContent").value;
  const updatedTags = document.getElementById("editTags").value.split(',').map(tag => tag.trim()).filter(tag => tag);

  if (!editingEntryId) return;

  const entryRef = window.doc(window.db, "diaries", editingEntryId);
  await window.updateDoc(entryRef, {
    title: updatedTitle,
    content: updatedContent,
    tags: updatedTags
  });

  closeEditModal();
  await loadEntries();
  displayEntry();
});
document.getElementById("cancelEditBtn").addEventListener("click", () => {
  closeEditModal();
});
document.getElementById("saveEditBtn").disabled = true;
// 保存処理…
document.getElementById("saveEditBtn").disabled = false;
// コメントモーダルを開く関数
function openCommentModal(postId) {
  const modal = document.getElementById("comment-modal");
  modal.style.display = "block";
  modal.dataset.postId = postId; // 投稿IDを保持（送信時に使う）
  // ⬇ ここが追加やで！
  loadComments(postId);
}
// 「×」ボタンでモーダルを閉じる
document.getElementById("close-comment-modal").addEventListener("click", () => {
  document.getElementById("comment-modal").style.display = "none";
});
document.getElementById("comment-submit").addEventListener("click", async () => {
  const name = document.getElementById("comment-name").value.trim() || "匿名さん";
  const text = document.getElementById("comment-text").value.trim();
  const postId = document.getElementById("comment-modal").dataset.postId;

  if (!text) {
    alert("コメントを入力してな！");
    return;
  }

  const comment = {
    name,
    text,
    date: new Date().toISOString(),
  };

  try {
    const ref = window.collection(window.db, "diaries", postId, "comments");
    await window.addDoc(ref, comment);

    // コメント表示を更新
    await loadComments(postId);

    // フォームリセット＆モーダル閉じる
    document.getElementById("comment-name").value = "";
    document.getElementById("comment-text").value = "";
    document.getElementById("comment-modal").style.display = "none";

  } catch (err) {
    console.error("コメント保存エラー：", err);
    alert("コメントの保存に失敗したで…");
  }
});
// 左メニュー開閉処理
document.getElementById("menuToggle").addEventListener("click", () => {
  const menuItems = document.getElementById("menuItems");
  menuItems.classList.toggle("active");
});
// 投稿フォームの開閉トグル
const formWrapper = document.querySelector(".form-wrapper");

document.getElementById("iconPost").addEventListener("click", () => {
  const isVisible = window.getComputedStyle(formWrapper).display !== "none";
  formWrapper.style.display = isVisible ? "none" : "block";
});


// タグ検索欄へスクロール＋フォーカス
document.getElementById("iconTag").addEventListener("click", () => {
  const input = document.getElementById("searchInput");
  input.scrollIntoView({ behavior: "smooth", block: "center" });
  input.focus();
});

// お気に入り投稿だけを絞り込み表示
document.getElementById("iconFavorite").addEventListener("click", () => {
  filteredData = diaryData.filter(entry => {
    const likedKey = `liked_${entry.id}`;
    return localStorage.getItem(likedKey);
  });
  currentIndex = 0;
  displayEntry();
});

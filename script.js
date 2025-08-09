import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


document.addEventListener("DOMContentLoaded", () => {
  let diaryData = [];
  let filteredData = [];
  let currentIndex = 0;
  let editingEntryId = null;
  let editingEntryUid = null; // ←追加：編集対象の投稿者UIDを保持
  // --- プロフィール取得キャッシュ（uid → {iconUrl}） ---
const profileCache = new Map();

async function getProfile(uid){
  if(!uid) return {};
  if(profileCache.has(uid)) return profileCache.get(uid);
  try{
    const ref = window.doc(window.db, "profiles", uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    profileCache.set(uid, data);
    return data;
  }catch(e){
    console.warn("profile load error", e);
    return {};
  }
}

async function saveProfile(uid, iconUrl){
  const ref = window.doc(window.db, "profiles", uid);
  await setDoc(ref, { iconUrl }, { merge: true });
  profileCache.set(uid, { iconUrl });
}

let selectedIcon = null;

// 初期：プロフィールがあれば選択状態に反映
(async ()=>{
  const uid = window.currentUser?.uid;
  const prof = await getProfile(uid);
  if (prof?.iconUrl) {
    selectedIcon = prof.iconUrl;
    document.querySelectorAll(".profile-icon").forEach(i=>{
      if (i.dataset.icon === selectedIcon) i.classList.add("selected");
    });
  }
})();

// クリック：選択＆即保存 → 表示更新
document.querySelectorAll(".profile-icon").forEach(icon => {
  icon.addEventListener("click", async () => {
    document.querySelectorAll(".profile-icon").forEach(i => i.classList.remove("selected"));
    icon.classList.add("selected");
    selectedIcon = icon.dataset.icon;

    const uid = window.currentUser?.uid;
    if (!uid) { alert("ログイン中です。数秒後にお試しください。"); return; }

    try{
      await saveProfile(uid, selectedIcon);
      // 最新表示にも反映
      displayEntry();
    }catch(e){
      console.error(e);
      alert("アイコンの保存に失敗しました。通信環境をご確認ください。");
    }
  });
});


  
  // スプラッシュ非表示処理（ふわっと消す）
  const splash = document.getElementById("splash-screen");
  if (splash) {
    setTimeout(() => {
      splash.style.transition = "opacity 1s ease";
      splash.style.opacity = "0";
      setTimeout(() => {
        splash.style.display = "none";
      }, 1000);
    }, 800);
  }
document.getElementById("closeFormBtn")?.addEventListener("click", function () {
    const formWrapper = document.querySelector(".form-wrapper");
    if (formWrapper) {
      formWrapper.classList.remove("active"); // ← class制御がおすすめ
    }
  });

  // ...他の処理の続き
  // 投稿読み込み・表示
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
  p.innerHTML = convertNewlinesToBr(text);
  p.classList.add("collapsed");
  wrapper.appendChild(p);

  if (text.length > 100) {
    const btn = document.createElement("button");
    btn.className = "readmore-btn";
    btn.textContent = "続きを読む";

    btn.addEventListener("click", () => {
      if (p.classList.contains("collapsed")) {
        p.classList.remove("collapsed");
        btn.textContent = "閉じる";
      } else {
        p.classList.add("collapsed");
        btn.textContent = "続きを読む";
      }
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
`;

// ▼ by行（アイコン＋テキスト）
const byline = document.createElement("div");
byline.className = "byline";

const avatarImg = document.createElement("img");
avatarImg.className = "avatar";
avatarImg.alt = "avatar";
// 未設定時のフォールバック（任意の1枚にしてOK）
avatarImg.src = "image/avatars/プロフィール-01.svg";

const byText = document.createElement("small");
byText.innerHTML = `by ${entry.name} ｜ ${formatDate(entry.date)}`;

byline.appendChild(avatarImg);
byline.appendChild(byText);
entryHTML.appendChild(byline);

// プロフィールからアイコン差し替え
(async ()=>{
  const prof = await getProfile(entry.uid);
  if (prof?.iconUrl) avatarImg.src = prof.iconUrl;
})();


    const expandable = createExpandableContent(entry.content);
    (entryHTML.querySelector("h3") || entryHTML).insertAdjacentElement("afterend", expandable);
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

  const editBtn = document.createElement("button");
  editBtn.textContent = "編集";
  editBtn.className = "edit-btn";
  editBtn.addEventListener("click", () => {
    openEditModal(entry);
  });

  // ▼ by行の“直下”にボタン行を差し込む
  const actions = document.createElement("div");
  actions.className = "entry-actions";
  actions.appendChild(deleteBtn);
  actions.appendChild(editBtn);

  // ▼ 投稿カードの末尾にボタンを追加
entryHTML.appendChild(actions);

}


    const commentIcon = entryHTML.querySelector(".comment-icon");
    if (commentIcon) {
      commentIcon.addEventListener("click", () => {
        openCommentModal(entry.id);
      });
    }

    const commentCountSpan = document.createElement("span");
    commentCountSpan.className = "comment-count";
    commentCountSpan.textContent = "...";

    const commentRef = window.collection(window.db, "diaries", entry.id, "comments");
    window.getDocs(commentRef).then(snap => {
      commentCountSpan.textContent = snap.size;
    });

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
      ? comments.map(c => `<p>🗨 <strong>${c.name}</strong>：${c.text} <small>（${formatDate(c.date)}）</small></p>`).join("")
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
        ? `<img src="${entry.imageUrl}" class="thumbnail-image" />
           <div class="thumbnail-text">${entry.title}<br><small>${entry.name}</small></div>`
        : `<div class="thumbnail-text"><strong>${entry.title}</strong><br>${contentPreview}<br><small>${entry.name}</small></div>`;

      div.addEventListener("click", () => {
        currentIndex = index;
        displayEntry();
      });
      bar.appendChild(div);
    });
  }

  // 検索・タグ
  document.getElementById("searchBtn")?.addEventListener("click", () => {
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

  document.getElementById("clearBtn")?.addEventListener("click", () => {
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

  // メニュー・フォーム開閉
  document.getElementById("menuToggle")?.addEventListener("click", () => {
    const menu = document.getElementById("menuItems");
    const icon = document.getElementById("menuToggle");
    menu.classList.toggle("active");
    icon.classList.toggle("flipped");
  });

  const formWrapper = document.querySelector(".form-wrapper");
const iconPost = document.getElementById("iconPost");

iconPost.addEventListener("click", () => {
  formWrapper.classList.toggle("active");
});


  document.getElementById("iconTag")?.addEventListener("click", () => {
    const input = document.getElementById("searchInput");
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus();
  });

  document.getElementById("iconFavorite")?.addEventListener("click", () => {
    filteredData = diaryData.filter(entry => {
      const likedKey = `liked_${entry.id}`;
      return localStorage.getItem(likedKey);
    });
    currentIndex = 0;
    displayEntry();
  });

  // 編集モーダル
function openEditModal(entry) {
  editingEntryId  = entry.id;
  editingEntryUid = entry.uid || null;

  document.getElementById("editTitle").value    = entry.title   || "";
  document.getElementById("editContent").value  = entry.content || "";
  document.getElementById("editTags").value     = Array.isArray(entry.tags) ? entry.tags.join(", ") : (entry.tags || "");
  document.getElementById("editImageUrl").value = entry.imageUrl || ""; // ←追加

  document.getElementById("editModal").classList.add("active");
}



function closeEditModal() {
  editingEntryId = null;
  editingEntryUid = null; // ←追加
  document.getElementById("editModal").classList.remove("active");
}



  document.getElementById("saveEditBtn")?.addEventListener("click", async () => {
  try {
    const updatedTitle   = document.getElementById("editTitle").value.trim();
    const updatedContent = document.getElementById("editContent").value.trim();
    const updatedTagsRaw = document.getElementById("editTags").value;
    const updatedImageUrl = document.getElementById("editImageUrl").value.trim();


    if (!editingEntryId) return;

    // 1) 本人チェック（保存前に必ず確認）
    if (!window.currentUser || !editingEntryUid || window.currentUser.uid !== editingEntryUid) {
      alert("この投稿を編集する権限がありません。");
      return;
    }

    // 2) タグは配列に正規化（空要素は除外）
    const updatedTags = updatedTagsRaw
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    // 3) Firestore 更新
    const entryRef = window.doc(window.db, "diaries", editingEntryId);
    await window.updateDoc(entryRef, {
      title: updatedTitle,
      content: updatedContent,
      tags: updatedTags,
      imageUrl: updatedImageUrl
    });

    // 4) UI更新（リロードなし）
    closeEditModal();
    await loadEntries();
    displayEntry();
  } catch (err) {
    console.error("編集の保存に失敗しました:", err);
    alert("保存中にエラーが発生しました。");
  }
});


  document.getElementById("cancelEditBtn")?.addEventListener("click", () => {
    closeEditModal();
  });

  // コメントモーダル
  function openCommentModal(postId) {
  const modal = document.getElementById("comment-modal");
  modal.classList.add("active"); // ← ここだけ変更
  modal.dataset.postId = postId;
  loadComments(postId);
}

document.getElementById("close-comment-modal")?.addEventListener("click", () => {
  document.getElementById("comment-modal").classList.remove("active"); // ← ここも変更
});
document.getElementById("comment-cancel")?.addEventListener("click", () => {
  document.getElementById("comment-modal").classList.remove("active");
});

document.getElementById("comment-text")?.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

  document.getElementById("comment-submit")?.addEventListener("click", async () => {
    const name = document.getElementById("comment-name").value.trim() || "匿名さん";
    const text = document.getElementById("comment-text").value.trim();
    const postId = document.getElementById("comment-modal").dataset.postId;
    if (!text) return alert("コメントを入力してな！");

    const comment = { name, text, date: new Date().toISOString() };

    try {
      const ref = window.collection(window.db, "diaries", postId, "comments");
      await window.addDoc(ref, comment);
      await loadComments(postId);
      document.getElementById("comment-name").value = "";
      document.getElementById("comment-text").value = "";
      document.getElementById("comment-modal").style.display = "none";
    } catch (err) {
      console.error("コメント保存エラー：", err);
      alert("コメントの保存に失敗したで…");
    }
  });

    // ← ★ここより上に 投稿処理のコードを追加！このコメント探してね！

  // 投稿処理
  document.getElementById("submitBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();

    const name = document.getElementById("username").value.trim() || "匿名さん";
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();
    const tags = document.getElementById("tags").value.split(",").map(t => t.trim()).filter(t => t);
    const imageFile = document.getElementById("imageInput").files[0];

    if (!title || !content) {
      alert("タイトルと本文は必須やで！");
      return;
    }

    const post = {
      name,
      title,
      content,
      tags,
      date: new Date().toISOString(),
      uid: window.currentUser?.uid || null,
      likes: 0,
    };

    try {
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("upload_preset", "todoku_upload");

        const res = await fetch("https://api.cloudinary.com/v1_1/dvzapaede/image/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        post.imageUrl = data.secure_url;
      }

      await window.addDoc(window.collection(window.db, "diaries"), post);

      // 入力欄をリセット
      document.getElementById("username").value = "";
      document.getElementById("title").value = "";
      document.getElementById("content").value = "";
      document.getElementById("tags").value = "";
      document.getElementById("imageInput").value = "";
      document.querySelector(".form-wrapper")?.classList.remove("active");

      await loadEntries();
      displayEntry();

    } catch (err) {
      console.error("投稿エラー：", err);
      alert("投稿に失敗したで…");
    }
  });

  // 投稿データ読み込み＆表示 ←★この下はもともとあるやつ
  (async () => {
    await loadEntries();
    displayEntry();
  })();
});
// 📌 本文欄の高さ自動調整
const contentTextarea = document.getElementById("content");

contentTextarea.addEventListener("input", () => {
  contentTextarea.style.height = "auto"; // 一度リセット
  contentTextarea.style.height = contentTextarea.scrollHeight + "px"; // 内容に合わせて高さ調整
});


/***** 画像アップロード（Cloudinary unsigned） *****/
const CLOUD_NAME   = "dvzapaede";
const UPLOAD_PRESET= "todoku_upload";

const pickImageBtn  = document.getElementById("pickImageBtn");
const editImageFile = document.getElementById("editImageFile");
const editImageUrl  = document.getElementById("editImageUrl");
const uploadHint    = document.getElementById("uploadHint");

pickImageBtn?.addEventListener("click", () => {
  editImageFile?.click();
});

editImageFile?.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    uploadHint && (uploadHint.textContent = "アップロード中…");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Cloudinary upload failed");
    const json = await res.json();

    // 取得したURLを入力欄に反映
    if (editImageUrl) editImageUrl.value = json.secure_url || json.url || "";
    uploadHint && (uploadHint.textContent = "アップロード完了！");
  } catch (err) {
    console.error(err);
    uploadHint && (uploadHint.textContent = "アップロード失敗。もう一度お試しください。");
    alert("画像のアップロードに失敗しました。通信状況をご確認ください。");
  } finally {
    // 選択状態はクリアしておく
    if (editImageFile) editImageFile.value = "";
  }
});

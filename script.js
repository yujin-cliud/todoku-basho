document.addEventListener("DOMContentLoaded", () => {
  let diaryData = [];
  let filteredData = [];
  let currentIndex = 0;
  let editingEntryId = null;

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
      <small>by ${entry.name} ｜ ${formatDate(entry.date)}</small><br/>
      <p class="tags">
        タグ: ${(entry.tags || []).map(tag => `<span class="tag" data-tag="${tag}">#${tag}</span>`).join(" ")}
        <img src="./image/comment.svg" alt="コメント" class="menu-icon comment-icon" data-id="${entry.id}" style="width: 24px; height: 24px; margin-left: 8px; cursor: pointer;" />
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
      editBtn.className = "edit-btn";
      editBtn.addEventListener("click", () => {
        openEditModal(entry);
      });
      entryHTML.appendChild(editBtn);
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
  document.getElementById("iconPost")?.addEventListener("click", () => {
    const isVisible = window.getComputedStyle(formWrapper).display !== "none";
    formWrapper.style.display = isVisible ? "none" : "block";
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

  document.getElementById("saveEditBtn")?.addEventListener("click", async () => {
    const updatedTitle = document.getElementById("editTitle").value;
    const updatedContent = document.getElementById("editContent").value;
    const updatedTags = document.getElementById("editTags").value.split(',').map(t => t.trim());

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

  document.getElementById("cancelEditBtn")?.addEventListener("click", () => {
    closeEditModal();
  });

  // コメントモーダル
  function openCommentModal(postId) {
    const modal = document.getElementById("comment-modal");
    modal.style.display = "block";
    modal.dataset.postId = postId;
    loadComments(postId);
  }

  document.getElementById("close-comment-modal")?.addEventListener("click", () => {
    document.getElementById("comment-modal").style.display = "none";
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

  // 投稿データ読み込み＆表示
  (async () => {
    await loadEntries();
    displayEntry();
  })();
});

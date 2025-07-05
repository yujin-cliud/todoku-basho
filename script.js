// 投稿ボタン押したときの処理
document.getElementById("submit").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (!title || !content) {
    alert("タイトルと本文を入力してね！");
    return;
  }

  const newPost = {
    username: username || "匿名さん", // ←空白なら"匿名さん"
    title,
    content,
    date: new Date().toLocaleString(),
  };

  // 保存処理
  let posts = JSON.parse(localStorage.getItem("posts") || "[]");
  posts.unshift(newPost);
  localStorage.setItem("posts", JSON.stringify(posts));

  // 表示更新
  displayPosts();

  // フォームをリセット
  document.getElementById("username").value = "";
  document.getElementById("title").value = "";
  document.getElementById("content").value = "";
});

// 投稿一覧の表示処理
function displayPosts() {
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  const postsContainer = document.getElementById("posts");
  postsContainer.innerHTML = "";

  posts.forEach((post) => {
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <h3>${post.title}</h3>
      <p>${post.content.replace(/\n/g, "<br>")}</p>
      <small>${post.date}</small>
    `;
    postsContainer.appendChild(div);
  });
}

// 最初の表示
window.addEventListener("load", displayPosts);

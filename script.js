// 投稿ボタン押したときの処理
document.getElementById("submit").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const imageInput = document.getElementById("image");

  if (!title || !content) {
    alert("タイトルと本文を入力してね！");
    return;
  }

  // 画像読み込み（非同期処理）
  const reader = new FileReader();

  reader.onload = function () {
    const imageData = reader.result; // Base64形式の画像データ

    const newPost = {
      username: username || "匿名さん",
      title,
      content,
      image: imageData || null,
      date: new Date().toLocaleString(),
    };

    let posts = JSON.parse(localStorage.getItem("posts") || "[]");
    posts.unshift(newPost);
    localStorage.setItem("posts", JSON.stringify(posts));

    displayPosts();

    // フォームリセット
    document.getElementById("username").value = "";
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";
    document.getElementById("image").value = "";
  };

  // ファイルがある場合のみ読み込む
  if (imageInput.files && imageInput.files[0]) {
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    // 画像が選ばれてない場合も対応
    reader.onload(); // ダミーで実行
  }
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
      ${post.image ? `<img src="${post.image}" alt="投稿画像">` : ""}
      <small>by ${post.username} ｜ ${post.date}</small>
    `;
    postsContainer.appendChild(div);
  });
}


// 最初の表示
window.addEventListener("load", displayPosts);

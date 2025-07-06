// 📅 日付を「2025年7月6日（日） 午後2時35分」みたいに整える関数
function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth() + 1;
  const d = dateObj.getDate();
  const day = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
  const h = dateObj.getHours();
  const min = dateObj.getMinutes().toString().padStart(2, '0');

  const ampm = h < 12 ? "午前" : "午後";
  const hour12 = h % 12 === 0 ? 12 : h % 12;

  return `${y}年${m}月${d}日（${day}） ${ampm}${hour12}時${min}分`;
}

let diaryData = [];
let currentIndex = 0;

// 📥 投稿処理
document.getElementById('submit').addEventListener('click', () => {
  const name = document.getElementById('username').value.trim() || "匿名さん";
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();

  if (!title || !content) {
    alert("タイトルと本文を入力してね！");
    return;
  }

  const dateObj = new Date();
  const date = formatDate(dateObj); // ←ここで整形された日付を使う
  const newEntry = { name, title, content, date };

  diaryData.unshift(newEntry); // 新しい投稿を先頭に
  localStorage.setItem("diaryData", JSON.stringify(diaryData)); // 保存
  currentIndex = 0;
  displayEntry();

  // フォーム初期化
  document.getElementById('username').value = '';
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
});

// ◀ 前へ
document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentIndex < diaryData.length - 1) {
    currentIndex++;
    displayEntry();
  }
});

// ▶ 次へ
document.getElementById('nextBtn').addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    displayEntry();
  }
});

// 📖 表示処理
function displayEntry() {
  const container = document.getElementById('diary-container');
  container.innerHTML = "";

  if (!diaryData[currentIndex]) return;

  const entry = diaryData[currentIndex];

  container.innerHTML = `
    <div class="entry">
      <h3>${entry.title}</h3>
      <p>${entry.content}</p>
      <small>by ${entry.name} ｜ ${entry.date}</small>
      <button id="deleteBtn">この投稿を削除</button>
    </div>
  `;

  // 🗑 削除処理
  document.getElementById("deleteBtn").addEventListener("click", () => {
    const ok = confirm("この投稿を削除しますか？");
    if (!ok) return;

    diaryData.splice(currentIndex, 1);
    localStorage.setItem("diaryData", JSON.stringify(diaryData));

    if (currentIndex > 0) currentIndex--;
    displayEntry();
  });
}

// 🔁 起動時にlocalStorageから読み込み
window.addEventListener('load', () => {
  const stored = localStorage.getItem("diaryData");
  if (stored) {
    diaryData = JSON.parse(stored);
  }
  displayEntry();
});

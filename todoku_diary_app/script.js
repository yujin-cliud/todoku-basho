document.getElementById("diary-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const nickname = document.getElementById("nickname").value || "匿名さん";
  const title = document.getElementById("title").value || "(無題)";
  const content = document.getElementById("content").value.trim();

  if (!content) return;

  const date = new Date();
  const dateString = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;

  const diary = {
    nickname,
    title,
    content,
    date: dateString
  };

  saveDiary(diary);
  displayDiaries();
  this.reset();
});

function saveDiary(entry) {
  const diaries = JSON.parse(localStorage.getItem("diaries") || "[]");
  diaries.unshift(entry);
  localStorage.setItem("diaries", JSON.stringify(diaries));
}

function displayDiaries() {
  const diaryList = document.getElementById("diary-list");
  const diaries = JSON.parse(localStorage.getItem("diaries") || "[]");

  diaryList.innerHTML = "";
  diaries.forEach(entry => {
    const div = document.createElement("div");
    div.className = "diary";
    div.innerHTML = `
      <div><strong>${entry.date}</strong></div>
      <div><em>${entry.nickname}</em></div>
      <div><strong>${entry.title}</strong></div>
      <div>${entry.content}</div>
    `;
    diaryList.appendChild(div);
  });
}

window.onload = displayDiaries;

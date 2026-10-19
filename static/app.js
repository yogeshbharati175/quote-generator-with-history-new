const quoteText = document.getElementById("quoteText");
const quoteAuthor = document.getElementById("quoteAuthor");
const statusEl = document.getElementById("status");
const favoritesList = document.getElementById("favoritesList");
const favoriteCount = document.getElementById("favoriteCount");
let currentQuote = null;

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {"Content-Type": "application/json"},
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#c34242" : "#27845d";
}

async function loadQuote() {
  const button = document.getElementById("newQuoteBtn");
  button.disabled = true;
  setStatus("");
  quoteText.textContent = "Finding a little inspiration...";
  try {
    currentQuote = await api("/api/quote");
    quoteText.textContent = `“${currentQuote.quote}”`;
    quoteAuthor.textContent = currentQuote.author;
  } catch (error) {
    quoteText.textContent = "Could not load a quote right now.";
    setStatus(error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function loadFavorites() {
  try {
    const favorites = await api("/api/favorites");
    favoriteCount.textContent = `${favorites.length} saved`;
    favoritesList.replaceChildren();
    if (!favorites.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No favorites yet. Save a quote you love!";
      favoritesList.appendChild(empty);
      return;
    }
    favorites.forEach(item => {
      const card = document.createElement("article");
      card.className = "favorite-item";
      const copy = document.createElement("div");
      copy.className = "favorite-copy";
      const quote = document.createElement("div");
      quote.className = "favorite-quote";
      quote.textContent = `“${item.quote}”`;
      const author = document.createElement("div");
      author.className = "favorite-author";
      author.textContent = `— ${item.author} · ${item.created_at}`;
      copy.append(quote, author);
      const actions = document.createElement("div");
      actions.className = "item-actions";
      const copyBtn = document.createElement("button");
      copyBtn.className = "small-btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(`${item.quote} — ${item.author}`);
        setStatus("Favorite quote copied!");
      });
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "small-btn delete-btn";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        try {
          await api(`/api/favorites/${item.id}`, {method: "DELETE"});
          setStatus("Favorite removed.");
          await loadFavorites();
        } catch (error) { setStatus(error.message, true); }
      });
      actions.append(copyBtn, deleteBtn);
      card.append(copy, actions);
      favoritesList.appendChild(card);
    });
  } catch (error) {
    favoritesList.textContent = "Could not load favorites. Refresh the page and try again.";
  }
}

document.getElementById("newQuoteBtn").addEventListener("click", loadQuote);
document.getElementById("favoriteBtn").addEventListener("click", async () => {
  if (!currentQuote) return setStatus("Load a quote first.", true);
  try {
    await api("/api/favorites", {method: "POST", body: JSON.stringify(currentQuote)});
    setStatus("Quote saved to your favorites!");
    await loadFavorites();
  } catch (error) { setStatus(error.message, true); }
});
document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!currentQuote) return setStatus("Load a quote first.", true);
  try {
    await navigator.clipboard.writeText(`${currentQuote.quote} — ${currentQuote.author}`);
    setStatus("Quote copied to clipboard!");
  } catch (error) { setStatus("Clipboard access failed. Try using HTTPS.", true); }
});

loadQuote();
loadFavorites();

const sectionTitle = document.getElementById("sectionTitle");
const resultsDiv = document.getElementById("suggestedAnime");
const searchInput = document.getElementById("search");

let debounceTimeout;

// Load top/trending anime by default
window.addEventListener("DOMContentLoaded", () => {
  console.log("Loading default suggestions...");
  sectionTitle.textContent = "🔥 Trending Anime";
  fetchSuggestions();
});

// 🔍 Live search
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimeout);
  const query = searchInput.value.trim();
  if (!query) {
    sectionTitle.textContent = "🔥 Trending Anime";
    fetchSuggestions();
    return;
  }

  debounceTimeout = setTimeout(() => {
    fetchSingleAnime(query);
  }, 400);
});

// 📦 Fetch top anime
async function fetchSuggestions() {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/top/anime?limit=12`);
    const data = await res.json();
    displayAnimeGrid(data.data);
  } catch (err) {
    console.error("Error fetching suggestions:", err);
    resultsDiv.innerHTML = `<p class="text-red-500">Couldn’t load suggestions 😓</p>`;
  }
}

// 🖼️ Grid of small cards
function displayAnimeGrid(animeList) {
  resultsDiv.innerHTML = "";

  animeList.forEach((anime) => {
    const card = document.createElement("div");
    card.className =
      "bg-zinc-800 rounded-lg shadow-lg overflow-hidden hover:scale-105 transition duration-200";

    card.innerHTML = `
      <img src="${anime.images.jpg.image_url}" alt="${
      anime.title
    }" class="w-full h-60 object-cover">
      <div class="p-4 space-y-1">
        <h3 class="text-lg font-bold text-green-400">
          ${anime.title_english || anime.title}
        </h3>
        <p class="text-sm text-zinc-300">${
          anime.synopsis?.slice(0, 80) || "No description..."
        }</p>
        <p class="text-xs text-zinc-500">Rating: <span class="text-white font-semibold">${
          anime.score ?? "?"
        }</span></p>
      </div>
    `;

    card.addEventListener("click", () => {
      sectionTitle.textContent = anime.title_english || anime.title;
      displaySingleAnime(anime);
    });

    resultsDiv.appendChild(card);
  });
}

// 🔍 Fetch specific anime based on input
async function fetchSingleAnime(query) {
  sectionTitle.textContent = `🔍 Result for "${query}"`;
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    // Prefer anime with English title
    const anime = data.data.find((a) => a.title_english) || data.data[0];
    if (!anime) {
      resultsDiv.innerHTML = `<p class="text-gray-400">No anime found for "${query}"</p>`;
      return;
    }

    displaySingleAnime(anime);
  } catch (err) {
    console.error("Error fetching anime:", err);
    resultsDiv.innerHTML = `<p class="text-red-500">Something went wrong 😢</p>`;
  }
}

// 📄 Big detailed card view
function displaySingleAnime(anime) {
  resultsDiv.innerHTML = "";
  resultsDiv.className = "items-center";

  const backBtn = document.createElement("button");
  backBtn.textContent = "⬅️ Back to suggestions";
  backBtn.className =
    "mb-4 px-4 py-2 bg-green-500 text-white font-semibold rounded hover:bg-green-600 transition";

  backBtn.addEventListener("click", () => {
    sectionTitle.textContent = "🔥 Trending Anime";
    location.reload();
  });

  const card = document.createElement("div");
  card.className =
    "bg-zinc-800 rounded-lg shadow-xl p-6 w-full mx-auto text-left space-y-4";

  const isMobile = window.innerWidth < 640;

  let content = "";

  // 📱 Mobile: show image first
  if (isMobile) {
    content += `
      <img src="${anime.images.jpg.image_url}" alt="${anime.title}" 
        class="w-full max-w-2xl mx-auto object-contain h-72 rounded-md" />
    `;
  } else {
    // 💻 Desktop: show trailer first
    content += anime.trailer?.embed_url
      ? `<iframe src="${anime.trailer.embed_url}" 
          class="w-full aspect-video rounded-md" 
          frameborder="0" allowfullscreen></iframe>`
      : `<p class="text-sm text-zinc-400 text-center">🎬 No trailer available 😢</p>`;
  }

  // ✍️ Details
  content += `
    <h2 class="text-3xl font-bold text-green-400">${
      anime.title_english || anime.title
    }</h2>
    <p class="text-zinc-300">${anime.synopsis}</p>
    <p><strong>Episodes:</strong> ${anime.episodes ?? "?"}</p>
    <p><strong>Rating:</strong> ${anime.score ?? "N/A"}</p>
  `;

  // 📱 On mobile, show trailer below
  if (isMobile && anime.trailer?.embed_url) {
    content += `
      <div>
        <h3 class="text-white font-semibold mt-4 mb-1">🎬 Trailer:</h3>
        <iframe src="${anime.trailer.embed_url}" 
          class="w-full aspect-video rounded-md" 
          frameborder="0" allowfullscreen></iframe>
      </div>
    `;
  }

  // 🌐 Streaming platforms
  content += `
    <div class="pt-4">
      <h3 class="text-lg font-semibold mb-1 text-white">🌐 Stream on:</h3>
      <ul class="list-disc pl-6 text-zinc-400">
        <li><a href="https://crunchyroll.com" target="_blank" class="underline text-green-300">Crunchyroll</a></li>
        <li><a href="https://animepahe.ru" target="_blank" class="underline text-green-300">AnimePahe</a></li>
        <li><a href="https://gogoanime.ai" target="_blank" class="underline text-green-300">Gogoanime</a></li>
      </ul>
    </div>
  `;

  card.innerHTML = content;
  resultsDiv.appendChild(backBtn);
  resultsDiv.appendChild(card);
}

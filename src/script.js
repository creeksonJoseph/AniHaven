const sectionTitle = document.getElementById("sectionTitle");
const resultsDiv = document.getElementById("suggestedAnime");
const form = document.getElementById("anime-form");
const searchInput = document.getElementById("search");

// Page loads with trending/top anime suggestions
window.addEventListener("DOMContentLoaded", () => {
  console.log("Loading default suggestions...");
  sectionTitle.textContent = "🔥 Trending Anime";
  fetchSuggestions();
});
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
// Search form triggers a single anime fetch
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  fetchSingleAnime(query);
  searchInput.value = "";
});

// Display grid of anime cards
function displayAnimeGrid(animeList) {
  resultsDiv.innerHTML = "";

  animeList.forEach((anime) => {
    const card = document.createElement("div");
    card.className =
      "bg-zinc-800 rounded-lg shadow-lg overflow-hidden hover:scale-105 transition duration-200";

    card.innerHTML = `
          <img src="${anime.images.jpg.image_url}" alt="${anime.title}
      " class="w-full h-60 object-cover">
          <div class="p-4 space-y-1">
            <h3 class="text-lg font-bold text-green-400">${anime.title}</h3>
            <p class="text-sm text-zinc-300">${
              anime.synopsis?.slice(0, 80) || "No description..."
            }</p>
            <p class="text-xs text-zinc-500">Rating: <span class="text-white font-semibold">${
              anime.score ?? "?"
            }
            </span></p>
          </div>
        `;
    card.addEventListener("click", () => {
      displaySingleAnime(anime);
    });
    resultsDiv.appendChild(card);
  });
}
// Fetch single anime when searched
async function fetchSingleAnime(query) {
  sectionTitle.textContent = `🔍 Result for "${query}"`;
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    const anime = data.data[0];
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

// Display one big centered anime card
function displaySingleAnime(anime) {
  resultsDiv.innerHTML = "";
  resultsDiv.className = "items-center";
  //create back button to display trending anime
  const backBtn = document.createElement("button");
  backBtn.textContent = "⬅️ Back to suggestions";
  backBtn.className =
    "mb-4 px-4 py-2 bg-green-500 text-white font-semibold rounded hover:bg-green-600 transition";

  backBtn.addEventListener("click", () => {
    sectionTitle.textContent = "🔥 Trending Anime";
    fetchSuggestions();
  });

  const card = document.createElement("div");
  card.className =
    "bg-zinc-800 rounded-lg shadow-xl p-6 w-full mx-auto text-left space-y-4";

  card.innerHTML = `
      <img src="${anime.images.jpg.image_url}" alt="${
    anime.title
  }" class="w-full rounded-md object-cover h-72">
      <h2 class="text-3xl font-bold text-green-400">${anime.title}</h2>
      <p class="text-zinc-300">${anime.synopsis}</p>
      <p><strong>Episodes:</strong> ${anime.episodes ?? "?"}</p>
      <p><strong>Rating:</strong> ${anime.score ?? "N/A"}</p>
      ${
        anime.trailer?.embed_url
          ? `<iframe src="${anime.trailer.embed_url}" class="w-full aspect-video rounded-md" frameborder="0" allowfullscreen></iframe>`
          : `<p class="text-sm text-zinc-400">No trailer available 😢</p>`
      }
      
      <div class="pt-4">
        <h3 class="text-lg font-semibold mb-1 text-white">🌐 Stream on:</h3>
        <ul class="list-disc pl-6 text-zinc-400">
          <li><a href="https://crunchyroll.com" target="_blank" class="underline text-green-300">Crunchyroll</a></li>
          <li><a href="https://animepahe.ru" target="_blank" class="underline text-green-300">AnimePahe</a></li>
          <li><a href="https://gogoanime.ai" target="_blank" class="underline text-green-300">Gogoanime</a></li>
        </ul>
      </div>
    `;
  resultsDiv.appendChild(backBtn);
  resultsDiv.appendChild(card);
}

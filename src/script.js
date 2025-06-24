const sectionTitle = document.getElementById("sectionTitle");
const resultsDiv = document.getElementById("suggestedAnime");
const form = document.getElementById("anime-form");

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
//function declarations

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
            <p class="text-xs text-zinc-500">Score: <span class="text-white font-semibold">${
              anime.score ?? "?"
            }
            </span></p>
          </div>
        `;

    resultsDiv.appendChild(card);
  });
}

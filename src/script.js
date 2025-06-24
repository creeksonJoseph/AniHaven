const sectionTitle = document.getElementById("sectionTitle");
const resultsDiv = document.getElementById("suggested-anime");
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

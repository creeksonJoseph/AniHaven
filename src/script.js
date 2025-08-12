const sectionTitle = document.getElementById("sectionTitle");
const resultsDiv = document.getElementById("suggestedAnime");
const searchInput = document.getElementById("search");
const loadingSpinner = document.getElementById("loadingSpinner");

let debounceTimeout;
let currentPage = 1;
let isLoading = false;
let hasMorePages = true;
let currentMode = 'trending';
let currentQuery = '';

// Load top-trending anime by default
window.addEventListener("DOMContentLoaded", () => {
  console.log("Loading default suggestions...");
  sectionTitle.textContent = " Trending Anime";
  fetchSuggestions();
});

// Infinite scroll
window.addEventListener('scroll', () => {
  if (isLoading || !hasMorePages) return;
  
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollTop + clientHeight >= scrollHeight - 1000) {
    loadMoreContent();
  }
});

//  Live search
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimeout);
  const query = searchInput.value.trim();

  debounceTimeout = setTimeout(() => {
    if (query) {
      resetPagination();
      currentMode = 'search';
      currentQuery = query;
      fetchSearchResults(query);
    } else {
      resetPagination();
      currentMode = 'trending';
      sectionTitle.textContent = " Trending Anime";
      fetchSuggestions();
    }
  }, 400);
});

// Prevent Enter from refreshing the page
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;
    resetPagination();
    currentMode = 'search';
    currentQuery = query;
    fetchSearchResults(query);
  }
});

function showSpinner() {
  loadingSpinner.classList.remove('hidden');
}

function hideSpinner() {
  loadingSpinner.classList.add('hidden');
}

function resetPagination() {
  currentPage = 1;
  hasMorePages = true;
  resultsDiv.innerHTML = '';
}

async function loadMoreContent() {
  if (currentMode === 'trending') {
    await fetchSuggestions(true);
  } else if (currentMode === 'search') {
    await fetchSearchResults(currentQuery, true);
  }
  // Don't load more content in single anime view
}

//  Fetch top anime
async function fetchSuggestions(append = false) {
  if (isLoading) return;
  isLoading = true;
  showSpinner();
  
  try {
    const res = await fetch(`https://api.jikan.moe/v4/top/anime?limit=12&page=${currentPage}`);
    const data = await res.json();
    
    if (data.data.length === 0) {
      hasMorePages = false;
    } else {
      displayAnimeGrid(data.data, append);
      currentPage++;
    }
  } catch (err) {
    console.error("Error fetching suggestions:", err);
    if (!append) {
      resultsDiv.innerHTML = `<p class="text-red-500">Couldn't load suggestions 😓</p>`;
    }
  } finally {
    isLoading = false;
    hideSpinner();
  }
}

//  Grid of small cards
function displayAnimeGrid(animeList, append = false) {
  if (!append) {
    resultsDiv.innerHTML = "";
    resultsDiv.className = "grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4";
  }

  animeList.forEach((anime) => {
    const card = document.createElement("div");
    card.className =
      "bg-zinc-800 rounded-lg shadow-lg overflow-hidden hover:scale-105 transition duration-200";

    card.innerHTML = `
      <img src="${anime.images.jpg.image_url}" alt="${anime.title_english || anime.title} anime poster" class="w-full h-60 object-cover" loading="lazy">
      <div class="p-4 space-y-1">
        <h3 class="text-lg font-bold text-green-400">
          ${anime.title_english || anime.title}
        </h3>
        <p class="text-sm text-zinc-300">${
          anime.synopsis?.slice(0, 80) || "No description available"
        }</p>
        <p class="text-xs text-zinc-500">Rating: <span class="text-white font-semibold">${
          anime.score ?? "Not rated"
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

async function fetchSearchResults(query, append = false) {
  if (isLoading) return;
  isLoading = true;
  showSpinner();
  
  if (!append) {
    sectionTitle.textContent = `🔍 Results for "${query}"`;
  }
  
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&page=${currentPage}&limit=12`
    );
    const data = await res.json();

    if (data.data.length === 0) {
      hasMorePages = false;
      if (!append) {
        resultsDiv.innerHTML = `<p class="text-gray-400">No anime found for "${query}"</p>`;
      }
      return;
    }

    displayAnimeGrid(data.data, append);
    currentPage++;
  } catch (err) {
    console.error("Error fetching anime:", err);
    if (!append) {
      resultsDiv.innerHTML = `<p class="text-red-500">Something went wrong 😢</p>`;
    }
  } finally {
    isLoading = false;
    hideSpinner();
  }
}

// Update page meta for SEO
function updatePageMeta(anime) {
  const title = anime.title_english || anime.title;
  document.title = `${title} - AniHaven | Anime Reviews & Streaming`;
  
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.content = `Watch ${title} trailer, read reviews, and find streaming platforms. ${anime.synopsis?.slice(0, 120) || 'Discover this anime'} on AniHaven.`;
  }
}

// Big detailed card view
function displaySingleAnime(anime) {
  updatePageMeta(anime);
  resultsDiv.innerHTML = "";
  resultsDiv.className = "items-center";
  
  // Disable infinite scroll in single view
  currentMode = 'single';
  hasMorePages = false;

  const backBtn = document.createElement("button");
  backBtn.textContent = "Back";
  backBtn.className =
    "mb-4 px-4 py-2  bg-zinc-600 text-green-500 hover:bg-green-500 hover:text-white font-semibold rounded transition";

  backBtn.addEventListener("click", () => {
    // Reset page meta
    document.title = "AniHaven - Discover, Review & Stream Your Favorite Anime | Free Anime Search";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = "Discover anime with AniHaven! Search thousands of anime titles, watch trailers, read reviews, and find streaming platforms. Your ultimate anime discovery tool.";
    }
    
    resetPagination();
    currentMode = 'trending';
    searchInput.value = '';
    sectionTitle.textContent = " Trending Anime";
    resultsDiv.className = "grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4";
    fetchSuggestions();
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
    //  Desktop: show trailer first
    content += anime.trailer?.embed_url
      ? `<iframe src="${anime.trailer.embed_url}" 
          class="w-full aspect-video rounded-md" 
          frameborder="0" allowfullscreen></iframe>`
      : `<p class="text-sm text-zinc-400 text-center">🎬 No trailer available 😢</p>`;
  }

  //  Details
  content += `
    <h2 class="text-3xl font-bold text-green-400">${
      anime.title_english || anime.title
    }</h2>
    <p class="text-zinc-300">${anime.synopsis}</p>
    <p><strong>Episodes:</strong> ${anime.episodes ?? "?"}</p>
    <p><strong>Rating:</strong> ${anime.score ?? "N/A"}</p>
  `;

  //  On mobile, show trailer below
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
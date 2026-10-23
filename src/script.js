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

// ─── AniList GraphQL API (replaces Jikan) ───────────────────────────────────
const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

// Shared fields requested for every anime
const ANIME_FIELDS = `
  id
  title { romaji english }
  coverImage { large }
  description
  averageScore
  episodes
  trailer { id site }
`;

// Core GraphQL fetch helper
async function anilistFetch(query, variables = {}) {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(json.errors?.[0]?.message || `AniList error (${res.status})`);
  }
  return json;
}

// Strip HTML tags that AniList includes in descriptions
function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

// Build a YouTube/Dailymotion embed URL from AniList's trailer object
function buildTrailerUrl(trailer) {
  if (!trailer?.id || !trailer?.site) return null;
  if (trailer.site.toLowerCase() === 'youtube') {
    return `https://www.youtube.com/embed/${trailer.id}`;
  }
  if (trailer.site.toLowerCase() === 'dailymotion') {
    return `https://www.dailymotion.com/embed/video/${trailer.id}`;
  }
  return null;
}

// Normalize AniList media → internal shape (matches what display fns expect)
function normalizeAniList(media) {
  return {
    title_english: media.title?.english || null,
    title: media.title?.romaji || 'Unknown Title',
    images: { jpg: { image_url: media.coverImage?.large || '' } },
    synopsis: stripHtml(media.description) || 'No description available.',
    score: media.averageScore ? (media.averageScore / 10).toFixed(1) : null,
    episodes: media.episodes ?? null,
    trailer: { embed_url: buildTrailerUrl(media.trailer) },
  };
}

// Fetch trending anime
async function fetchSuggestions(append = false) {
  if (isLoading) return;
  isLoading = true;
  showSpinner();

  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(type: ANIME, sort: TRENDING_DESC) { ${ANIME_FIELDS} }
      }
    }
  `;

  try {
    const json = await anilistFetch(query, { page: currentPage, perPage: 12 });
    const page = json.data.Page;
    const items = (page.media || []).map(normalizeAniList);

    if (items.length === 0 || !page.pageInfo.hasNextPage) {
      hasMorePages = false;
    }
    if (items.length > 0) {
      displayAnimeGrid(items, append);
      currentPage++;
    }
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    if (!append) {
      displayErrorMessage(
        "Couldn't load suggestions",
        err.message || 'AniList service may be temporarily unavailable.',
        () => fetchSuggestions()
      );
    }
  } finally {
    isLoading = false;
    hideSpinner();
  }
}

function displayErrorMessage(title, details, retryCallback) {
  resultsDiv.className = "w-full flex justify-center";
  resultsDiv.innerHTML = `
    <div class="text-center py-10 px-6 bg-slate-900/80 rounded-xl border border-slate-700/60 max-w-md w-full mx-auto my-6 space-y-3 shadow-lg">
      <p class="text-3xl">⚠️</p>
      <h3 class="text-lg font-bold text-red-500">${title}</h3>
      <p class="text-sm text-slate-400 leading-relaxed">${details}</p>
      ${retryCallback ? '<button id="retryApiBtn" class="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition duration-150 cursor-pointer">Retry</button>' : ''}
    </div>
  `;
  if (retryCallback) {
    document.getElementById("retryApiBtn")?.addEventListener("click", () => {
      resetPagination();
      retryCallback();
    });
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
      "bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group";

    const imageUrl = anime.images?.jpg?.image_url || '';

    card.innerHTML = `
      <div class="relative overflow-hidden aspect-[3/4]">
        <img src="${imageUrl}" alt="${anime.title_english || anime.title || 'Anime'} poster" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy">
      </div>
      <div class="p-4 space-y-1">
        <h3 class="text-lg font-bold font-heading text-slate-100 group-hover:text-indigo-400 line-clamp-1">
          ${anime.title_english || anime.title}
        </h3>
        <p class="text-sm text-slate-400 line-clamp-2">${
          anime.synopsis?.slice(0, 80) || "No description available"
        }</p>
        <p class="text-xs text-slate-500 font-medium">Rating: <span class="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md">${
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

  const gqlQuery = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { hasNextPage }
        media(search: $search, type: ANIME) { ${ANIME_FIELDS} }
      }
    }
  `;

  try {
    const json = await anilistFetch(gqlQuery, { search: query, page: currentPage, perPage: 12 });
    const page = json.data.Page;
    const items = (page.media || []).map(normalizeAniList);

    if (items.length === 0) {
      hasMorePages = false;
      if (!append) {
        resultsDiv.className = 'w-full flex justify-center';
        resultsDiv.innerHTML = `<p class="text-gray-400 py-8">No anime found for "${query}"</p>`;
      }
      return;
    }

    displayAnimeGrid(items, append);
    currentPage++;
    if (!page.pageInfo.hasNextPage) hasMorePages = false;
  } catch (err) {
    console.error('Error fetching anime:', err);
    if (!append) {
      displayErrorMessage(
        `Something went wrong searching for "${query}"`,
        err.message || 'AniList service may be temporarily unavailable.',
        () => fetchSearchResults(query)
      );
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
    "mb-6 px-4 py-2 bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white font-semibold rounded-lg flex items-center gap-2 transition max-w-max";

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
    "bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 w-full mx-auto text-left space-y-6";

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
      : `<p class="text-sm text-slate-400 text-center">🎬 No trailer available 😢</p>`;
  }

  //  Details
  content += `
    <h2 class="text-3xl md:text-4xl font-bold font-heading text-slate-100">${
      anime.title_english || anime.title
    }</h2>
    <p class="text-slate-300 leading-relaxed text-lg">${anime.synopsis}</p>
    <p><strong>Episodes:</strong> ${anime.episodes ?? "?"}</p>
    <p><strong>Rating:</strong> ${anime.score ?? "N/A"}</p>
  `;

  //  On mobile, show trailer below
  if (isMobile && anime.trailer?.embed_url) {
    content += `
      <div>
        <h3 class="text-slate-100 font-semibold font-heading mt-6 mb-2">🎬 Trailer:</h3>
        <iframe src="${anime.trailer.embed_url}" 
          class="w-full aspect-video rounded-md" 
          frameborder="0" allowfullscreen></iframe>
      </div>
    `;
  }

  // 🌐 Streaming platforms
  content += `
    <div class="pt-4">
      <h3 class="text-lg font-semibold font-heading mb-2 text-slate-100">🌐 Stream on:</h3>
      <ul class="list-disc pl-6 text-slate-400">
        <li><a href="https://crunchyroll.com" target="_blank" class="text-indigo-400 hover:text-indigo-300 hover:underline">Crunchyroll</a></li>
        <li><a href="https://animepahe.ru" target="_blank" class="text-indigo-400 hover:text-indigo-300 hover:underline">AnimePahe</a></li>
        <li><a href="https://gogoanime.ai" target="_blank" class="text-indigo-400 hover:text-indigo-300 hover:underline">Gogoanime</a></li>
      </ul>
    </div>
  `;

  card.innerHTML = content;
  resultsDiv.appendChild(backBtn);
  resultsDiv.appendChild(card);
}
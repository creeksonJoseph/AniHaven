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
      "bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 hover:bg-white/10 transition-all duration-300 cursor-pointer group flex flex-col";

    const imageUrl = anime.images?.jpg?.image_url || '';

    card.innerHTML = `
      <div class="relative overflow-hidden aspect-[3/4]">
        <img src="${imageUrl}" alt="${anime.title_english || anime.title || 'Anime'} poster" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80"></div>
        <div class="absolute bottom-3 left-3 right-3 flex justify-between items-end">
          <span class="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-full border border-white/10 shadow-lg">
            <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
            ${anime.score ?? "N/A"}
          </span>
          ${anime.episodes ? `<span class="bg-black/60 backdrop-blur-md text-slate-300 text-xs font-medium px-2 py-1 rounded-md border border-white/10 shadow-lg">${anime.episodes} EPS</span>` : ''}
        </div>
      </div>
      <div class="p-5 flex-grow flex flex-col justify-between">
        <div class="space-y-2">
          <h3 class="text-lg font-bold font-heading text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1" title="${anime.title_english || anime.title}">
            ${anime.title_english || anime.title}
          </h3>
          <p class="text-sm text-slate-400 line-clamp-2 leading-relaxed">${
            anime.synopsis?.slice(0, 100) || "No description available"
          }</p>
        </div>
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

  const wrapper = document.createElement("div");
  wrapper.className = "w-full max-w-5xl mx-auto relative";

  // Create a blurred background element if possible
  const backdrop = document.createElement("div");
  backdrop.className = "absolute inset-0 -z-10 rounded-3xl overflow-hidden opacity-20 blur-3xl";
  backdrop.innerHTML = `<img src="${anime.images.jpg.image_url}" class="w-full h-full object-cover">`;

  const card = document.createElement("div");
  card.className =
    "bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 md:p-10 w-full text-left flex flex-col md:flex-row gap-8";

  let content = "";
  const title = anime.title_english || anime.title;
  const ratingBadge = `<span class="inline-flex items-center gap-1 bg-black/60 text-indigo-300 text-sm font-bold px-3 py-1 rounded-full border border-white/10"><svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>${anime.score ?? "N/A"}</span>`;
  const epsBadge = anime.episodes ? `<span class="bg-black/60 text-slate-300 text-sm font-medium px-3 py-1 rounded-full border border-white/10">${anime.episodes} Episodes</span>` : '';

  // Left column: Poster
  content += `
    <div class="w-full md:w-1/3 flex-shrink-0">
      <img src="${anime.images.jpg.image_url}" alt="${title}" class="w-full h-auto rounded-2xl shadow-xl border border-white/10">
      <div class="mt-6">
        <h3 class="text-lg font-semibold font-heading mb-3 text-slate-100 border-b border-white/10 pb-2">Where to Watch</h3>
        <ul class="space-y-2">
          <li><a href="https://crunchyroll.com" target="_blank" class="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors bg-white/5 p-2 rounded-lg hover:bg-white/10"><span class="text-xl">📺</span> Crunchyroll</a></li>
          <li><a href="https://animepahe.ru" target="_blank" class="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors bg-white/5 p-2 rounded-lg hover:bg-white/10"><span class="text-xl">🎬</span> AnimePahe</a></li>
        </ul>
      </div>
    </div>
  `;

  // Right column: Details and Trailer
  content += `
    <div class="w-full md:w-2/3 flex flex-col space-y-6">
      <div>
        <h2 class="text-3xl md:text-5xl font-bold font-heading text-white tracking-tight mb-4">${title}</h2>
        <div class="flex flex-wrap gap-3 mb-6">
          ${ratingBadge}
          ${epsBadge}
        </div>
        <div class="bg-black/20 p-5 rounded-2xl border border-white/5">
          <h3 class="text-slate-300 font-semibold mb-2 font-heading uppercase tracking-wider text-sm">Synopsis</h3>
          <p class="text-slate-300 leading-relaxed text-base">${anime.synopsis}</p>
        </div>
      </div>

      ${anime.trailer?.embed_url ? `
      <div class="mt-auto pt-6 border-t border-white/10">
        <h3 class="text-xl font-semibold font-heading mb-4 text-slate-100 flex items-center gap-2"><span class="text-red-500">▶</span> Official Trailer</h3>
        <div class="rounded-xl overflow-hidden shadow-2xl border border-white/10 aspect-video">
          <iframe src="${anime.trailer.embed_url}" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>
      ` : ''}
    </div>
  `;

  card.innerHTML = content;
  wrapper.appendChild(backdrop);
  wrapper.appendChild(card);

  resultsDiv.appendChild(backBtn);
  resultsDiv.appendChild(wrapper);
}
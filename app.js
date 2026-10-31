const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const DEFAULT_CITIES = [
  { id: "london", name: "London", country: "United Kingdom", latitude: 51.5072, longitude: -0.1276 },
  { id: "new-york", name: "New York", country: "United States", latitude: 40.7128, longitude: -74.006 },
  { id: "tokyo", name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
];

const elements = {
  citySearch: document.querySelector("#city-search"),
  searchForm: document.querySelector("#search-form"),
  searchResults: document.querySelector("#search-results"),
  currentCity: document.querySelector("#current-city"),
  currentDate: document.querySelector("#current-date"),
  currentLabel: document.querySelector("#current-label"),
  currentContent: document.querySelector("#current-content"),
  weatherDetails: document.querySelector("#weather-details"),
  locationBadge: document.querySelector("#location-badge"),
  forecastList: document.querySelector("#forecast-list"),
  forecastCity: document.querySelector("#forecast-city"),
  cityList: document.querySelector("#city-list"),
  cityCount: document.querySelector("#city-count"),
  notice: document.querySelector("#notice"),
  updatedLabel: document.querySelector("#updated-label"),
  locationButton: document.querySelector("#location-button"),
};

const state = {
  cities: [],
  selectedId: null,
  searchTimer: null,
};

const weatherDescriptions = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

const iconPaths = {
  sun: '<circle cx="32" cy="32" r="10" fill="currentColor"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M32 5v6M32 53v6M5 32h6M53 32h6M13 13l4 4M47 47l4 4M51 13l-4 4M17 47l-4 4"/></g>',
  cloud: '<path d="M16 47h32a11 11 0 0 0 0-22h-1a16 16 0 0 0-31-3 12.5 12.5 0 0 0 0 25Z" fill="currentColor"/>',
  rain: '<path d="M16 38h32a10 10 0 0 0 0-20h-1a15 15 0 0 0-29-3 11.5 11.5 0 0 0-2 23Z" fill="currentColor"/><g stroke="#6b8bf5" stroke-width="3" stroke-linecap="round"><path d="m22 44-3 6m15-6-3 6m15-6-3 6"/></g>',
  snow: '<path d="M16 35h32a10 10 0 0 0 0-20h-1a15 15 0 0 0-29-3 11.5 11.5 0 0 0-2 23Z" fill="currentColor"/><g fill="#7391f3"><circle cx="22" cy="45" r="2.5"/><circle cx="34" cy="48" r="2.5"/><circle cx="46" cy="44" r="2.5"/></g>',
  storm: '<path d="M16 36h32a10 10 0 0 0 0-20h-1a15 15 0 0 0-29-3 11.5 11.5 0 0 0-2 23Z" fill="currentColor"/><path d="m34 34-9 13h8l-3 10 12-15h-9l4-8Z" fill="#ffd46a"/>',
  fog: '<path d="M16 33h32a10 10 0 0 0 0-20h-1a15 15 0 0 0-29-3 11.5 11.5 0 0 0-2 23Z" fill="currentColor"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 40h40M17 48h30"/></g>',
};

function iconName(code) {
  if ([0, 1].includes(code)) return "sun";
  if ([2, 3].includes(code)) return "cloud";
  if ([45, 48].includes(code)) return "fog";
  if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return "rain";
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloud";
}

function weatherIcon(code, className = "") {
  const icon = iconPaths[iconName(code)];
  return `<svg class="${className}" viewBox="0 0 64 64" fill="none" aria-hidden="true">${icon}</svg>`;
}

function describeWeather(code) {
  return weatherDescriptions[code] || "Variable conditions";
}

function formatTemperature(value) {
  return `${Math.round(value)}°`;
}

function cityKey(city) {
  return city.id || `${city.name.toLowerCase()}-${city.latitude.toFixed(2)}-${city.longitude.toFixed(2)}`;
}

function showNotice(message) {
  elements.notice.textContent = message;
  elements.notice.hidden = false;
}

function clearNotice() {
  elements.notice.hidden = true;
  elements.notice.textContent = "";
}

function getCity(cityId) {
  return state.cities.find((city) => city.id === cityId);
}

async function fetchWeather(city) {
  const params = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days: "4",
    timezone: "auto",
  });
  const response = await fetch(`${API_BASE}?${params}`);
  if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
  return response.json();
}

function renderCityList() {
  elements.cityCount.textContent = String(state.cities.length);
  elements.cityList.innerHTML = state.cities.map((city) => {
    if (city.loading) {
      return `<div class="city-placeholder"><span class="spinner"></span><span>${escapeHtml(city.name)}</span></div>`;
    }
    if (city.error) {
      return `<div class="city-error">${escapeHtml(city.name)} — weather unavailable</div>`;
    }
    const active = city.id === state.selectedId ? " active" : "";
    return `<button type="button" class="city-card${active}" data-city-id="${escapeHtml(city.id)}" aria-pressed="${city.id === state.selectedId}">
      <span class="city-weather-icon">${weatherIcon(city.weather.current.weather_code)}</span>
      <span class="city-info"><strong>${escapeHtml(city.name)}</strong><span>${escapeHtml(city.country)}</span></span>
      <span class="city-temp">${formatTemperature(city.weather.current.temperature_2m)}<small></small></span>
    </button>`;
  }).join("");
}

function renderCurrent(city, weather) {
  const current = weather.current;
  const date = new Date(`${current.time.slice(0, 10)}T12:00:00Z`);
  elements.currentCity.textContent = city.name;
  elements.currentDate.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long", month: "long", day: "numeric",
    timeZone: "UTC",
  }).format(date);
  elements.currentLabel.textContent = city.isCurrentLocation ? "YOUR LOCAL WEATHER" : "CURRENT WEATHER";
  elements.locationBadge.hidden = !city.isCurrentLocation;
  elements.currentContent.innerHTML = `
    <div class="temperature-block">
      <span class="weather-icon-large">${weatherIcon(current.weather_code)}</span>
      <div>
        <div class="temperature">${formatTemperature(current.temperature_2m)}<sup></sup></div>
        <p class="weather-description">${escapeHtml(describeWeather(current.weather_code))}</p>
        <p class="feels-like">Feels like ${formatTemperature(current.apparent_temperature)}</p>
      </div>
    </div>
  `;
  elements.weatherDetails.innerHTML = `
    ${detailMarkup("humidity", "Humidity", `${Math.round(current.relative_humidity_2m)}%`)}
    ${detailMarkup("wind", "Wind", `${Math.round(current.wind_speed_10m)} km/h`)}
    ${detailMarkup("rain", "Precipitation", `${current.precipitation} mm`)}
  `;
  elements.weatherDetails.hidden = false;
  elements.forecastCity.textContent = city.name;
  renderForecast(weather);
  const localTime = current.time.slice(11, 16);
  elements.updatedLabel.textContent = localTime ? `Updated ${localTime} local` : "Updated just now";
}

function detailMarkup(type, label, value) {
  const icons = {
    humidity: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" stroke="currentColor" stroke-width="1.6"/><path d="M9 15a3 3 0 0 0 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h17a2 2 0 1 1-2 2M3 16h10a3 3 0 1 1-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    rain: '<path d="M16 14a4.5 4.5 0 0 0-.2-9A5.5 5.5 0 0 0 5.5 7.4 3.4 3.4 0 0 0 6 14h10Z" stroke="currentColor" stroke-width="1.5"/><path d="m9 17-1 3m6-3-1 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  };
  return `<div class="detail-item"><span class="detail-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${icons[type]}</svg></span><span class="detail-copy"><span>${label}</span><strong>${value}</strong></span></div>`;
}

function renderForecast(weather) {
  const daily = weather.daily;
  const today = daily.time[0];
  const days = daily.time.map((date, index) => ({ date, index })).filter(({ date }) => date !== today).slice(0, 3);
  elements.forecastList.innerHTML = days.map(({ date, index }) => {
    const dayName = new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
    const code = daily.weather_code[index];
    return `<article class="forecast-day">
      <p class="forecast-day-name">${dayName}</p>
      <div class="forecast-weather">${weatherIcon(code)}<p class="forecast-temp">${formatTemperature(daily.temperature_2m_max[index])}<span>${formatTemperature(daily.temperature_2m_min[index])}</span></p></div>
      <p class="forecast-condition">${escapeHtml(describeWeather(code))}</p>
    </article>`;
  }).join("");
}

function selectCity(city) {
  state.selectedId = city.id;
  clearNotice();
  renderCityList();
  if (city.weather) {
    renderCurrent(city, city.weather);
    return;
  }
  elements.currentCity.textContent = city.name;
  elements.currentDate.textContent = city.country;
  elements.currentLabel.textContent = city.isCurrentLocation ? "YOUR LOCAL WEATHER" : "CURRENT WEATHER";
  elements.locationBadge.hidden = !city.isCurrentLocation;
  elements.currentContent.innerHTML = '<div class="loading-weather"><span class="spinner"></span><span>Fetching the latest forecast</span></div>';
  elements.weatherDetails.hidden = true;
  elements.forecastCity.textContent = city.name;
  elements.forecastList.innerHTML = '<div class="forecast-skeleton"></div><div class="forecast-skeleton"></div><div class="forecast-skeleton"></div>';
}

async function loadCityWeather(city) {
  city.loading = true;
  city.error = false;
  city.id = city.id || cityKey(city);
  renderCityList();
  try {
    city.weather = await fetchWeather(city);
    city.loading = false;
    city.error = false;
    if (city.id === state.selectedId) renderCurrent(city, city.weather);
  } catch (error) {
    city.loading = false;
    city.error = true;
    console.error(`Unable to load weather for ${city.name}:`, error);
    if (city.id === state.selectedId) {
      elements.currentContent.innerHTML = '<div class="loading-weather">Weather could not be loaded. Please try again.</div>';
      elements.forecastList.innerHTML = '<p class="forecast-condition">Forecast unavailable right now.</p>';
      elements.updatedLabel.textContent = "Weather unavailable";
    }
  }
  renderCityList();
}

function addCity(city, { select = true } = {}) {
  const id = city.id || cityKey(city);
  const existing = state.cities.find((saved) => saved.id === id);
  if (existing) {
    if (select) selectCity(existing);
    return existing;
  }
  const newCity = { ...city, id, loading: true };
  state.cities.push(newCity);
  if (select) selectCity(newCity);
  renderCityList();
  loadCityWeather(newCity);
  return newCity;
}

async function searchCities(query) {
  const params = new URLSearchParams({ name: query, count: "6", language: "en", format: "json" });
  const response = await fetch(`${GEOCODING_BASE}?${params}`);
  if (!response.ok) throw new Error(`City search returned ${response.status}`);
  const data = await response.json();
  return data.results || [];
}

function renderSearchResults(cities) {
  elements.searchResults.innerHTML = "";
  if (!cities.length) {
    const empty = document.createElement("div");
    empty.className = "search-result";
    empty.textContent = "No cities found. Try another name.";
    elements.searchResults.append(empty);
    elements.searchResults.hidden = false;
    return;
  }
  for (const result of cities) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.setAttribute("role", "option");
    const name = document.createElement("strong");
    name.textContent = result.name;
    const detail = document.createElement("span");
    detail.textContent = [result.admin1, result.country].filter(Boolean).join(", ");
    button.append(name, detail);
    button.addEventListener("click", () => {
      const city = {
        id: `place-${result.id}`,
        name: result.name,
        country: result.country || result.admin1 || "Weather location",
        latitude: result.latitude,
        longitude: result.longitude,
      };
      elements.citySearch.value = "";
      elements.searchResults.hidden = true;
      addCity(city);
    });
    elements.searchResults.append(button);
  }
  elements.searchResults.hidden = false;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function requestLocation({ automatic = false } = {}) {
  if (!("geolocation" in navigator)) {
    if (!automatic) showNotice("Location is not supported by this browser. You can still search for a city.");
    return;
  }
  if (!automatic) {
    elements.locationButton.disabled = true;
    elements.locationButton.setAttribute("aria-label", "Finding your location");
  }
  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    const city = { id: "my-location", name: "Your location", country: "Current location", latitude, longitude, isCurrentLocation: true };
    clearNotice();
    addCity(city);
    elements.locationButton.disabled = false;
    elements.locationButton.setAttribute("aria-label", "Use my current location");
  }, (error) => {
    elements.locationButton.disabled = false;
    elements.locationButton.setAttribute("aria-label", "Use my current location");
    if (automatic) {
      showNotice(error.code === error.PERMISSION_DENIED
        ? "Location access is off. Your sample cities are ready — use the location button whenever you’d like a local forecast."
        : "Couldn’t determine your location. Your sample cities are ready, or search for a city.");
    } else {
      showNotice(error.code === error.PERMISSION_DENIED
        ? "Location permission was denied. Allow location access in your browser settings to see your local forecast."
        : "Couldn’t determine your location. Please try again or search for a city.");
    }
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

elements.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = elements.citySearch.value.trim();
  if (!query) {
    elements.citySearch.focus();
    return;
  }
  elements.searchResults.innerHTML = '<div class="search-result">Searching…</div>';
  elements.searchResults.hidden = false;
  try {
    renderSearchResults(await searchCities(query));
  } catch (error) {
    console.error("City search failed:", error);
    elements.searchResults.innerHTML = '<div class="search-result">Search is unavailable. Please try again.</div>';
    elements.searchResults.hidden = false;
  }
});

elements.citySearch.addEventListener("input", () => {
  clearTimeout(state.searchTimer);
  const query = elements.citySearch.value.trim();
  if (query.length < 2) {
    elements.searchResults.hidden = true;
    return;
  }
  state.searchTimer = setTimeout(async () => {
    try {
      renderSearchResults(await searchCities(query));
    } catch (error) {
      console.error("City search failed:", error);
      elements.searchResults.hidden = true;
    }
  }, 350);
});

elements.cityList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-city-id]");
  if (button) selectCity(getCity(button.dataset.cityId));
});

elements.locationButton.addEventListener("click", () => requestLocation());
document.addEventListener("click", (event) => {
  if (!elements.searchForm.contains(event.target)) elements.searchResults.hidden = true;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") elements.searchResults.hidden = true;
});

elements.footerYear = document.querySelector("#footer-year");
elements.footerYear.textContent = String(new Date().getFullYear());
elements.currentDate.textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
elements.currentCity.textContent = "Loading your weather…";
state.cities = DEFAULT_CITIES.map((city) => ({ ...city, loading: true }));
state.selectedId = DEFAULT_CITIES[0].id;
renderCityList();
for (const city of state.cities) loadCityWeather(city);
requestLocation({ automatic: true });

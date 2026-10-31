# Weatherly

Weatherly is a lightweight weather dashboard built with plain HTML, CSS, and JavaScript. It lets users check the current conditions and a 3-day forecast for a location, search for cities, save favorite places, and view their local weather when browser location access is available.

## Features

- Search for cities worldwide
- View current weather and feels-like temperature
- See humidity, wind speed, and precipitation
- Browse a 3-day forecast for the selected city
- Save multiple cities to a personal list
- Use browser geolocation for local weather
- Real-time updates powered by the Open-Meteo API

## Project structure

- `index.html` — app structure and UI layout
- `styles.css` — dashboard styling and responsive design
- `app.js` — weather logic, city search, rendering, and API requests

## Tech stack

- HTML5
- CSS3
- JavaScript (vanilla)
- Open-Meteo Geocoding API
- Open-Meteo Forecast API

## Run locally

Because this is a static frontend app, you can run it in either of these ways:

### Option 1: Open directly in a browser

Open `index.html` in any modern browser.

### Option 2: Use a local web server

From the project folder, run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Notes

- The app uses browser geolocation for "My location" and requires permission to access it.
- If you are offline or the API is unavailable, the interface will show a notice instead of the weather data.
- No build step or package installation is required.

## Credits

Weather data is provided by Open-Meteo.

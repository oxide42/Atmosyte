# Terrassevejret

A beautiful weather visualization app that displays temperature, precipitation, sun hours, and wind speed in an interactive chart with colorful info bars.

## Features

- **Interactive Weather Chart**: Line chart showing temperature trends and precipitation bars
- **Multiple Forecast Types**: Daily, 3-hour, and hourly forecasts
- **Visual Info Bars**:
  - Sun hours percentage (yellow gradient)
  - Wind speed intensity (red gradient)
- **Automatic Location**: Uses geolocation or falls back to Kolding, Denmark
- **Customizable Units**: Celsius/Fahrenheit temperatures, various wind speed units
- **Responsive Design**: Clean, modern interface

## Setup

1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Open the app in a web browser
3. Go to Settings and enter your API token
4. Save settings and return to main view

## Usage

### Running the App

```bash
# Serve files with Python
python -m http.server 8000

# Or use any web server
# Then visit http://localhost:8000
```

### Interface

1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Open the app in a web browser
3. Go to Settings and enter your API token
4. Save settings and return to main view

## Usage

### Running the App

```bash

- **Forecast Buttons**: Switch between Daily, 3 Hours, and Hourly views
- **Chart Legend**: Shows temperature (red line) and precipitation (blue bars)
- **Info Bars**:
  - Top bar: Sun hours (darker = more sun)
  - Bottom bar: Wind speed (darker red = stronger wind)

### Settings

- **Temperature Unit**: Celsius or Fahrenheit
- **Wind Speed Unit**: m/s, km/h, mph, or knots
- **API Token**: Your OpenWeatherMap API key

## Technology

- Vanilla JavaScript
- amCharts 5 for data visualization
- OpenWeatherMap API
- Local storage for settings
```

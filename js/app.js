class WeatherApp {
  constructor() {
    this.settings = new Settings();
    this.settings.onSettingsSaved = () => this.loadWeatherData();
    this.weatherService = new WeatherService(this.settings);
    this.locationService = new LocationService(this.settings);
    this.weatherChart = new WeatherChart(this.settings);
    this.currentForecastType = "threeHour";
    this.initializeUI();
    this.loadWeatherData();
    this.loadLocationName();
  }

  initializeUI() {
    const settingsBtn = document.getElementById("settingsBtn");
    const mainPage = document.getElementById("mainPage");
    const settingsPage = document.getElementById("settingsPage");

    settingsBtn.addEventListener("click", () => {
      // Toggle between main and settings
      if (settingsPage.classList.contains("active")) {
        this.showPage("main");
      } else {
        this.showPage("settings");
      }
    });
  }

  showPage(page) {
    const settingsBtn = document.getElementById("settingsBtn");
    const mainPage = document.getElementById("mainPage");
    const settingsPage = document.getElementById("settingsPage");

    if (page === "main") {
      settingsBtn.classList.remove("active");
      mainPage.classList.add("active");
      settingsPage.classList.remove("active");
    } else {
      settingsBtn.classList.add("active");
      mainPage.classList.remove("active");
      settingsPage.classList.add("active");
    }
  }

  async loadWeatherData() {
    const chartContainer = document.getElementById("chartContainer");
    chartContainer.innerHTML =
      '<div class="loading">Loading weather data...</div>';

    try {
      const weatherData = await this.weatherService.fetchWeatherData(
        this.currentForecastType,
      );
      chartContainer.innerHTML = "";
      this.weatherChart.createChart(weatherData);
    } catch (error) {
      chartContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  }

  async loadLocationName() {
    try {
      const locationService = this.locationService;
      const position = await locationService.getCurrentPosition();
      const placeName = await locationService.getCurrentPlaceName(
        position.coords.latitude,
        position.coords.longitude,
      );

      document.getElementById("locationName").textContent = placeName;
    } catch (error) {
      console.error("Error loading location name:", error);
      document.getElementById("locationName").textContent =
        "Location unavailable";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new WeatherApp();
});

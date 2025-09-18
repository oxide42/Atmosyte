class Settings {
  constructor() {
    this.defaultSettings = {
      weatherProvider: "openweathermap",
      owmApiToken: "",
      dmiApiToken: "",
      tempUnit: "celsius",
      windUnit: "ms",
      locationCacheMinutes: 15,
    };
    this.settings = this.loadSettings();
    this.initializeUI();
  }

  loadSettings() {
    const saved = localStorage.getItem("terrassevejret-settings");
    return saved
      ? { ...this.defaultSettings, ...JSON.parse(saved) }
      : this.defaultSettings;
  }

  saveSettings() {
    localStorage.setItem(
      "terrassevejret-settings",
      JSON.stringify(this.settings),
    );
  }

  initializeUI() {
    const weatherProvider = document.getElementById("weatherProvider");
    const owmApiToken = document.getElementById("owmApiToken");
    const dmiApiToken = document.getElementById("dmiApiToken");
    const tempUnit = document.getElementById("tempUnit");
    const windUnit = document.getElementById("windUnit");
    const locationCacheMinutes = document.getElementById(
      "locationCacheMinutes",
    );
    const saveBtn = document.getElementById("saveSettings");

    weatherProvider.value = this.settings.weatherProvider;
    owmApiToken.value = this.settings.owmApiToken;
    dmiApiToken.value = this.settings.dmiApiToken;
    tempUnit.value = this.settings.tempUnit;
    windUnit.value = this.settings.windUnit;
    locationCacheMinutes.value = this.settings.locationCacheMinutes;

    // Show/hide API token field based on provider
    this.toggleApiTokenField(this.settings.weatherProvider);

    // Listen for provider changes
    weatherProvider.addEventListener("change", (e) => {
      this.toggleApiTokenField(e.target.value);
    });

    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.settings.weatherProvider = weatherProvider.value;
      this.settings.owmApiToken = owmApiToken.value;
      this.settings.dmiApiToken = dmiApiToken.value;
      this.settings.tempUnit = tempUnit.value;
      this.settings.windUnit = windUnit.value;
      this.settings.locationCacheMinutes =
        parseInt(locationCacheMinutes.value) || 30;

      this.saveSettings();
      alert("Settings saved successfully!");

      // Trigger callback if provided
      if (this.onSettingsSaved) {
        this.onSettingsSaved();
      }
    });
  }

  toggleApiTokenField(provider) {
    const owmApiTokenGroup = document.querySelector(
      ".setting-group:has(#owmApiToken)",
    );
    const dmiApiTokenGroup = document.querySelector(
      ".setting-group:has(#dmiApiToken)",
    );

    if (owmApiTokenGroup && dmiApiTokenGroup) {
      owmApiTokenGroup.style.display = "none";
      dmiApiTokenGroup.style.display = "none";

      // Show appropriate API token field based on provider
      if (provider === "openweathermap") {
        owmApiTokenGroup.style.display = "block";
      } else if (provider === "dmi") {
        dmiApiTokenGroup.style.display = "block";
      }
    }
  }

  convertTemperature(celsius) {
    if (this.settings.tempUnit === "fahrenheit") {
      return (celsius * 9) / 5 + 32;
    }
    return celsius;
  }

  convertWindSpeed(ms) {
    switch (this.settings.windUnit) {
      case "kmh":
        return ms * 3.6;
      case "mph":
        return ms * 2.237;
      case "knots":
        return ms * 1.944;
      default:
        return ms;
    }
  }

  getTemperatureUnit() {
    return this.settings.tempUnit === "fahrenheit" ? "°F" : "°C";
  }

  getWindSpeedUnit() {
    switch (this.settings.windUnit) {
      case "kmh":
        return "km/h";
      case "mph":
        return "mph";
      case "knots":
        return "knots";
      default:
        return "m/s";
    }
  }
}

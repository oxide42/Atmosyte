class DmiProvider {
  constructor(settings) {
    this.settings = settings;
    this.cookieCache = new Cache();
  }

  async fetchWeatherData(latitude, longitude, forecastType) {
    // DMI API can use an API token for enhanced access if provided
    const apiToken = this.settings.settings.dmiApiToken;
    if (!this.settings.settings.dmiApiToken) {
      throw new Error(
        "Please configure your OpenWeatherMap API token in Settings. Get one free at https://openweathermap.org/api",
      );
    }

    const cachedResponce = this.cookieCache.get("provider-dmi-response");
    if (cachedResponce) {
      return this.processWeatherData(cachedResponce, forecastType);
    }

    let endpoint;
    let configuration =
      "wind-speed,temperature-2m,wind-dir-10m,fraction-of-cloud-cover-2m,total-precipitation";

    endpoint = `https://dmigw.govcloud.dk/v1/forecastedr/collections/harmonie_dini_sf/position?coords=POINT(${longitude} ${latitude})&crs=crs84&f=GeoJSON&parameter-name=${configuration}&api-key=${apiToken}`;

    switch (forecastType) {
      case "daily":
      case "hourly":
      case "threeHour":
      default:
    }

    try {
      const headers = {
        Accept: "application/json",
        "User-Agent": "Nimbus/1.0",
      };

      // Add API token to headers if provided
      if (apiToken) {
        headers["Authorization"] = `Bearer ${apiToken}`;
      }

      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error(`DMI API error: ${response.statusText}`);
      }

      const data = await response.json();

      this.cookieCache.set(
        "provider-dmi-response",
        data,
        this.settings.settings.locationCacheMinutes,
      );

      return this.processWeatherData(data, forecastType);
    } catch (error) {
      throw new Error("DMI API not available", error.message);
    }
  }

  processWeatherData(data, forecastType) {
    let processedData = [];

    if (data.features && data.features.length > 0) {
      processedData = data.features.map((item) => {
        const properties = item.properties;
        return {
          time: new Date(properties.step),
          temperature: this.settings.convertTemperature(
            properties["temperature-2m"] - 273.15,
          ),
          precipitation: properties["total-precipitation"],
          precipitationProb: null,
          windSpeed: this.settings.convertWindSpeed(properties["wind-speed"]),
          clouds: properties["fraction_of_cloud_cover_2m"],
          sunHours:
            100 * Math.max(0, 1 - properties["fraction_of_cloud_cover_2m"]),
        };
      });
    }

    return processedData;
  }

  // DMI provider information
  static getProviderInfo() {
    return {
      name: "DMI (Danmarks Meteorologiske Institut)",
      description: "Official Danish weather service",
      website: "https://www.dmi.dk/",
      requiresApiKey: true, // API token can be used for enhanced access
      dataSource: "DMI Open Data API",
    };
  }
}

class OpenMeteoProvider {
  constructor(settings) {
    this.settings = settings;
    this.cookieCache = new Cache();
  }

  async fetchWeatherData(latitude, longitude, forecastType) {
    const cachedResponce = this.cookieCache.get("provider-openmeteo-response");
    if (cachedResponce) {
      return this.processWeatherData(cachedResponce, forecastType);
    }

    let endpoint;
    let configuration =
      "temperature_2m,precipitation,wind_speed_10m,cloud_cover";

    endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${configuration}&models=dmi_seamless&timezone=auto`;

    try {
      const headers = {
        Accept: "application/json",
        "User-Agent": "Nimbus weather/1.0",
      };

      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.statusText}`);
      }

      const data = await response.json();

      this.cookieCache.set(
        "provider-openmeteo-response",
        data,
        this.settings.settings.locationCacheMinutes,
      );

      return this.processWeatherData(data, forecastType);
    } catch (error) {
      throw new Error("Open-Meteo API not available", error.message);
    }
  }

  processWeatherData(data, forecastType) {
    let processedData = [];

    if (data.hourly && data.hourly.time) {
      // Convert the structure
      // Hourly :{
      //    time: array of iso8601 strings,
      //    temperature_2m: array of floats in celsius,
      //    precipitation: array of floats in millimeters,
      //    wind_speed: array of floats in km/h,
      //    cloud_cover: array of floats in percentage (0-100)}

      processedData = data.hourly.time.map((time, index) => {
        const temp = data.hourly.temperature_2m[index];
        const precip = data.hourly.precipitation?.[index] || 0;
        const windSpeed = data.hourly.wind_speed?.[index] || 0;
        const cloudCover = data.hourly.cloud_cover?.[index] || 0;

        return {
          time: new Date(time),
          temperature: this.settings.convertTemperature(temp),
          tempMin: this.settings.convertTemperature(temp),
          tempMax: this.settings.convertTemperature(temp),
          precipitation: precip,
          precipitationProb: 0,
          windSpeed: this.settings.convertWindSpeed(windSpeed),
          clouds: cloudCover,
          sunHours: Math.max(0, 100 - cloudCover),
        };
      });
    }

    return {
      data: processedData,
      alerts: [],
    };
  }

  // Open-Meteo provider information
  static getProviderInfo() {
    return {
      name: "Open-Meteo",
      description: "Open source weather data",
      website: "https://open-meteo.com",
      requiresApiKey: false,
      dataSource: "Open-Meteo Open Data API",
    };
  }
}

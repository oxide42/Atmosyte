class OpenWeatherMapProvider {
  constructor(settings) {
    this.settings = settings;
  }

  async fetchWeatherData(latitude, longitude, forecastType) {
    if (!this.settings.settings.owmApiToken) {
      throw new Error(
        "Please configure your OpenWeatherMap API token in Settings. Get one free at https://openweathermap.org/api",
      );
    }

    let endpoint;
    switch (forecastType) {
      case "daily":
        endpoint = `https://api.openweathermap.org/data/2.5/forecast/daily?lat=${latitude}&lon=${longitude}&appid=${this.settings.settings.owmApiToken}&units=metric&cnt=7`;
        break;
      case "hourly":
        endpoint = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${this.settings.settings.owmApiToken}&units=metric`;
        break;
      case "threeHour":
      default:
        endpoint = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${this.settings.settings.owmApiToken}&units=metric`;
        break;
    }

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.processWeatherData(data, forecastType);
  }

  processWeatherData(data, forecastType) {
    let processedData = [];

    if (forecastType === "daily" && data.list) {
      processedData = data.list.map((item) => ({
        time: new Date(item.dt * 1000),
        temperature: this.settings.convertTemperature(item.temp.day),
        tempMin: this.settings.convertTemperature(item.temp.min),
        tempMax: this.settings.convertTemperature(item.temp.max),
        precipitation: item.rain ? item.rain : 0,
        precipitationProb: item.pop ? Math.round(item.pop * 100) : 0,
        windSpeed: this.settings.convertWindSpeed(item.speed),
        clouds: item.clouds,
        sunHours: Math.max(0, 100 - item.clouds),
      }));
    } else if (data.list) {
      processedData = data.list.map((item) => ({
        time: new Date(item.dt * 1000),
        temperature: this.settings.convertTemperature(item.main.temp),
        tempMin: this.settings.convertTemperature(item.main.temp_min),
        tempMax: this.settings.convertTemperature(item.main.temp_max),
        precipitation: item.rain ? item.rain["3h"] || item.rain["1h"] || 0 : 0,
        precipitationProb: item.pop ? Math.round(item.pop * 100) : 0,
        windSpeed: this.settings.convertWindSpeed(item.wind.speed),
        clouds: item.clouds.all,
        sunHours: Math.max(0, 100 - item.clouds.all),
      }));

      if (forecastType === "hourly") {
        processedData = processedData.slice(0, 24);
      }
    }

    return processedData;
  }
}

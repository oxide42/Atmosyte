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

    let exclude;
    switch (forecastType) {
      case "daily":
        exclude = `current,minutely,hourly`;
        break;
      case "hourly":
        exclude = `daily,minutely,current`;
        break;
    }

    let endpoint = `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}&exclude=${exclude}&appid=${this.settings.settings.owmApiToken}&units=metric`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.processWeatherData(data, forecastType);
  }

  processWeatherData(data, forecastType) {
    let selectedData;
    let processedData;

    if (forecastType === "daily" && data.daily) {
      processedData = data.daily.map((item) => ({
        time: new Date(item.dt * 1000),
        temperature: this.settings.convertTemperature(item.temp.day),
        tempMin: this.settings.convertTemperature(item.temp.min),
        tempMax: this.settings.convertTemperature(item.temp.max),
        precipitation: item.rain ? item.rain : 0,
        precipitationProb: item.pop ? Math.round(item.pop * 100) : 0,
        windSpeed: this.settings.convertWindSpeed(item.wind_speed),
        clouds: item.clouds,
        sunHours: Math.max(0, 100 - item.clouds),
      }));
    } else {
      processedData = data.hourly.map((item) => ({
        time: new Date(item.dt * 1000),
        temperature: this.settings.convertTemperature(item.temp),
        tempMin: this.settings.convertTemperature(item.temp),
        tempMax: this.settings.convertTemperature(item.temp),
        precipitation: item.rain ? item.rain["1h"] || item.rain["3h"] || 0 : 0,
        precipitationProb: item.pop ? Math.round(item.pop * 100) : 0,
        windSpeed: this.settings.convertWindSpeed(item.wind_speed),
        clouds: item.clouds,
        sunHours: Math.max(0, 100 - item.clouds),
      }));
    }

    return processedData;
  }
}

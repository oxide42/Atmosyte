class Provider {
  constructor(settings) {
    this.settings = settings;
    this.cookieCache = new Cache();
  }

  async fetchWeatherData(latitude, longitude, forecastType) {
    throw new Error("Method not implemented!");
  }

  processWeatherData(data, forecastType) {
    throw new Error("Method not implemented!");
  }

  _ema(data, property, ema_length = 3) {
    const alpha = 2 / (ema_length + 1); // 0.5
    const emaValues = [];

    let ema = data[0][property]; // seed with first value
    emaValues.push(ema);

    for (let i = 1; i < data.length; i++) {
      ema = alpha * data[i][property] + (1 - alpha) * ema;
      emaValues.push(ema);
    }
    return emaValues;
  }

  smooth(data) {
    const temp_ema = this._ema(data, "temperature", 3);
    const wind_ema = this._ema(data, "windSpeed", 3);

    // Apply ema on data structure
    data.forEach((item, index) => {
      item.temperature = temp_ema[index];
      item.windSpeed = wind_ema[index];
    });
  }

  static getProviderInfo() {
    throw new Error("Method not implemented!");
  }
}

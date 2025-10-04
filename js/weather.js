class WeatherService {
  constructor(settings) {
    this.settings = settings;
    this.providers = {
      openweathermap: OpenWeatherMapProvider,
      openmeteo: OpenMeteoProvider,
      dmi: DmiProvider,
    };
    this.currentProvider = this.settings.settings.weatherProvider;
    this.locationService = new LocationService(settings);
    this.sunService = new SunService();
  }

  setProvider(providerName) {
    if (!this.providers[providerName]) {
      throw new Error(`Unknown weather provider: ${providerName}`);
    }
    this.currentProvider = providerName;
  }

  getProvider() {
    const ProviderClass = this.providers[this.currentProvider];
    if (!ProviderClass) {
      throw new Error(`Unknown weather provider: ${this.currentProvider}`);
    }
    return new ProviderClass(this.settings);
  }

  async fetchWeatherData(forecastType) {
    try {
      const position = await this.locationService.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      const provider = this.getProvider();
      const result = await provider.fetchWeatherData(
        latitude,
        longitude,
        forecastType,
      );

      // Postprocess sun hours to correct for nighttime
      const correctedData = this.correctSunHours(
        result.data,
        latitude,
        longitude,
      );

      return {
        data: correctedData,
        alerts: result.alerts,
      };
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  /**
   * Correct sun hours data based on actual sunrise/sunset times
   * @param {Array} weatherData - Raw weather data from provider
   * @param {number} latitude - Latitude in degrees
   * @param {number} longitude - Longitude in degrees
   * @returns {Array} - Weather data with corrected sun hours
   */
  correctSunHours(weatherData, latitude, longitude) {
    return weatherData.map((dataPoint, index) => {
      const currentTime = dataPoint.time;

      // Calculate sun times for this data point's date
      const sunTimes = this.sunService.calculateSunTimes(
        latitude,
        longitude,
        currentTime,
      );

      // Convert sunrise and sunset times to decimal hours for comparison
      const sunriseDecimal = this.sunService.timeStringToDecimal(
        sunTimes.sunrise,
      );
      const sunsetDecimal = this.sunService.timeStringToDecimal(
        sunTimes.sunset,
      );
      const currentDecimal = this.sunService.getDecimalTime(currentTime);

      // Check if current time is during daylight hours
      const isDaylight =
        currentDecimal >= sunriseDecimal && currentDecimal <= sunsetDecimal;

      // If it's nighttime, set sun hours to 0
      // Otherwise, keep the original value but ensure it's not negative
      const correctedSunHours = isDaylight
        ? Math.max(0, dataPoint.sunHours || 0)
        : 0;

      return {
        ...dataPoint,
        sunHours: correctedSunHours,
        // Add debug info about sun times (can be removed later)
        _sunDebug: {
          sunrise: sunTimes.sunrise,
          sunset: sunTimes.sunset,
          isDaylight: isDaylight,
          originalSunHours: dataPoint.sunHours,
          correctedSunHours: correctedSunHours,
        },
      };
    });
  }
}

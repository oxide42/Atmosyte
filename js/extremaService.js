class ExtremaService {
  constructor(settings) {
    this.indexDistanceThreshold = 3;
    this.valueThresholdPct = 0.2;
    this.valueThresholdValue = 1;
    this.forecastType = settings.settings.forecastType;
  }

  /**
   * Find local extrema (minima and maxima) in a time series
   * @param {Array} timeSeries - Array of data points
   * @param {string} property - Property name to analyze (e.g., 'temperature')
   * @returns {Object} - Object with minima and maxima arrays
   */
  findLocalExtrema(timeSeries, property) {
    return this.smoothExtremas(this.extremaSimple(timeSeries, property));
  }

  /**
   * Simple extrema detection - finds all local minima and maxima
   * @param {Array} timeSeries - Array of data points
   * @param {string} property - Property name to analyze
   * @returns {Object} - Object with minima and maxima arrays
   */
  extremaSimple(timeSeries, property) {
    const minima = [];
    const maxima = [];
    const length = timeSeries.length;

    if (length === 0) return { minima, maxima };

    for (let i = 0; i < length; i++) {
      const current = timeSeries[i][property];
      const prev = i > 0 ? timeSeries[i - 1][property] : current;
      const next = i < length - 1 ? timeSeries[i + 1][property] : current;

      const point = { index: i, value: current, time: timeSeries[i].time };

      // Check for maximum
      if (current >= prev && current > next) {
        maxima.push(point);
      }
      // Check for minimum
      else if (current <= prev && current < next) {
        minima.push(point);
      }
    }

    return {
      minima: minima,
      maxima: maxima,
    };
  }

  /**
   * Smooth/filter extremas to remove noise and close duplicates
   * @param {Object} extremas - Object with minima and maxima arrays
   * @returns {Object} - Filtered extremas
   */
  smoothExtremas(extremas) {
    return this.filterExtremasCombined(extremas);
  }

  /**
   * Filter extremas by combining close points and rhttps://rethinkable.dkemoving noise
   * @param {Object} extremas - Object with minima and maxima arrays
   * @returns {Object} - Filtered extremas
   */
  filterExtremasCombined(extremas) {
    const allExtremas = [
      ...extremas.minima.map((e) => ({ ...e, type: "minimum" })),
      ...extremas.maxima.map((e) => ({ ...e, type: "maximum" })),
    ];

    if (!allExtremas.length) return { minima: [], maxima: [] };

    // Sort by index to process chronologically
    allExtremas.sort((a, b) => a.index - b.index);

    const result = [];
    let currentGroupPeak = allExtremas[0];
    let indexDistanceThreshold =
      this.forecastType === "hourly"
        ? this.indexDistanceThreshold * 3
        : this.indexDistanceThreshold;
    let valueThresholdPct = this.valueThresholdPct;
    let valueThresholdValue = this.valueThresholdValue;

    for (let i = 1; i < allExtremas.length; i++) {
      const { index: currIdx, value: currVal } = allExtremas[i];
      const { index: prevIdx, value: prevVal } = allExtremas[i - 1];

      const isCloseInIndex = currIdx - prevIdx <= indexDistanceThreshold;
      let isCloseInValue =
        Math.abs(
          (currVal - prevVal) / Math.max(Math.abs(currVal), Math.abs(prevVal)),
        ) <= valueThresholdPct;
      if (Math.abs(currVal - prevVal) < valueThresholdValue)
        isCloseInValue = true;

      if (isCloseInIndex && isCloseInValue) {
        // Keep more extreme value within the group
        // For mixed types, prefer the one with more extreme absolute deviation from average
        const avgValue = (currVal + prevVal) / 2;
        const currDeviation = Math.abs(currVal - avgValue);
        const prevDeviation = Math.abs(currentGroupPeak.value - avgValue);

        if (currDeviation > prevDeviation) {
          currentGroupPeak = allExtremas[i];
        }
      } else {
        result.push(currentGroupPeak);
        currentGroupPeak = allExtremas[i];
      }
    }
    result.push(currentGroupPeak);

    // Separate back into minima and maxima
    const filteredMinima = result
      .filter((e) => e.type === "minimum")
      .map((e) => ({
        index: e.index,
        value: e.value,
        time: e.time,
      }));
    const filteredMaxima = result
      .filter((e) => e.type === "maximum")
      .map((e) => ({
        index: e.index,
        value: e.value,
        time: e.time,
      }));

    return {
      minima: filteredMinima,
      maxima: filteredMaxima,
    };
  }

  /**
   * Mark datapoints with extremas property
   * @param {Array} timeSeries - Array of data points
   * @param {Array} properties - Array of property names to analyze (e.g., ['temperature', 'windSpeed'])
   * @returns {Array} - Time series with extremas property added
   */
  markExtrema(timeSeries, properties) {
    // Ensure properties is an array
    const propsArray = Array.isArray(properties) ? properties : [properties];

    // Create maps for each property
    const minimaMap = new Map(); // index -> [property names]
    const maximaMap = new Map(); // index -> [property names]

    propsArray.forEach((property) => {
      const extremas = this.findLocalExtrema(timeSeries, property);

      extremas.minima.forEach((e) => {
        if (!minimaMap.has(e.index)) {
          minimaMap.set(e.index, []);
        }
        minimaMap.get(e.index).push(property);
      });

      extremas.maxima.forEach((e) => {
        if (!maximaMap.has(e.index)) {
          maximaMap.set(e.index, []);
        }
        maximaMap.get(e.index).push(property);
      });
    });

    // Mark each datapoint
    return timeSeries.map((dataPoint, index) => {
      const minima = minimaMap.get(index);
      const maxima = maximaMap.get(index);

      // Only add extremas property if there are any extrema
      if (minima || maxima) {
        const extremas = {};
        if (minima) extremas.isMinima = minima;
        if (maxima) extremas.isMaxima = maxima;

        return {
          ...dataPoint,
          extremas: extremas,
        };
      }

      return dataPoint;
    });
  }
}

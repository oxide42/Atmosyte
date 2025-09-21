class WeatherChart {
  constructor(settings) {
    this.settings = settings;
    this.chart = null;
  }

  createChart(weatherData, containerId = "chartContainer") {
    if (this.chart) {
      this.chart.dispose();
    }

    const root = am5.Root.new(containerId);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: true,
        panY: false,
        wheelX: "panX",
        wheelY: "zoomX",
        pinchZoomX: true,
        layout: root.verticalLayout,
      }),
    );

    const xAxis = this.createXAxis(root, chart);
    const yAxis = this.createYAxis(root, chart);
    const yAxisRight = this.createYAxisRight(root, chart, yAxis);
    const windAxis = this.createWindAxis(root, chart, yAxis);

    const tempSeries = this.createTemperatureSeries(root, chart, xAxis, yAxis);
    const windSeries = this.createWindSeries(root, chart, xAxis, windAxis);
    const precipSeries = this.createPrecipitationSeries(
      root,
      chart,
      xAxis,
      yAxisRight,
    );
    const sunSeries = this.createSunSeries(root, chart, xAxis, yAxisRight);

    const processedData = this.processData(weatherData);
    let tempExtremas = this.findLocalExtrema(weatherData, "temperature");
    let windExtremas = this.findLocalExtrema(weatherData, "windSpeed");

    const chartData = this.prepareChartData(processedData);

    this.setSeriesData(
      [tempSeries, precipSeries, windSeries, sunSeries],
      chartData,
    );
    this.setupBullets(
      root,
      tempSeries,
      windSeries,
      tempExtremas,
      windExtremas,
      processedData,
    );
    this.setupChartEvents(chart, xAxis);

    this.chart = root;
  }

  //
  // Axes
  //

  createXAxis(root, chart) {
    const forecastType = this.settings.getForecastType();

    let unitCount = 1;
    switch (forecastType) {
      case "daily":
        unitCount = 24;
        break;
      case "3-hourly":
        unitCount = 3;
        break;
    }

    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: {
          timeUnit: "hour",
          count: unitCount,
        },
        markUnitChange: true,
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 30,
          opposite: true,
          maxLabelPosition: 0.99,
          minLabelPosition: 0.01,
        }),
        zoomX: true,
        zoomY: false,
        start: 0,
        end: 0.7,
      }),
    );

    xAxis.get("dateFormats")["hour"] = "HH";
    xAxis.get("dateFormats")["day"] = "[bold]EEE[/]";
    xAxis.get("periodChangeDateFormats")["day"] = "[bold]EEE[/]";
    xAxis.get("periodChangeDateFormats")["hour"] = "[bold]EEE[/]";

    return xAxis;
  }

  createYAxis(root, chart) {
    return chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        extraMax: 0.05,
        visible: false,
        strictMinMax: false,
        autoZoom: false,
        renderer: am5xy.AxisRendererY.new(root, {
          strokeDasharray: [1, 3],
        }),
      }),
    );
  }

  createYAxisRight(root, chart, yAxis) {
    return chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 5,
        strictMinMax: true,
        autoZoom: false,
        visible: false,
        renderer: am5xy.AxisRendererY.new(root, {
          opposite: true,
        }),
        syncWithAxis: yAxis,
      }),
    );
  }

  createWindAxis(root, chart, yAxis) {
    return chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        extraMax: 0.5,
        visible: false,
        strictMinMax: false,
        autoZoom: false,
        renderer: am5xy.AxisRendererY.new(root, {
          visible: false,
        }),
        syncWithAxis: yAxis,
      }),
    );
  }

  //
  // Series
  //

  createTemperatureSeries(root, chart, xAxis, yAxis) {
    const tempSeries = chart.series.push(
      am5xy.SmoothedXLineSeries.new(root, {
        name: `Temperature (${this.settings.getTemperatureUnit()})`,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "temperature",
        valueXField: "time",
        tension: 0.5,
      }),
    );

    tempSeries.set("fill", am5.color("#ff0000"));
    tempSeries.set("stroke", am5.color("#ff0000"));
    tempSeries.strokes.template.setAll({
      strokeWidth: 3,
      templateField: "strokeSettings",
    });

    return tempSeries;
  }

  createPrecipitationSeries(root, chart, xAxis, yAxis) {
    const precipSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: "Precipitation (mm)",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "precipitationBar",
        openValueYField: "precipitationBase",
        valueXField: "time",
      }),
    );

    precipSeries.fills.template.setAll({
      fillOpacity: 0.7,
      visible: true,
      templateField: "precipFillSettings",
    });

    return precipSeries;
  }

  createSunSeries(root, chart, xAxis, yAxis) {
    const sunSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: "Sun Hours",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "sunHoursBar",
        openValueYField: "sunHoursBase",
        valueXField: "time",
      }),
    );

    sunSeries.fills.template.setAll({
      fillOpacity: 0.5,
      visible: true,
      templateField: "sunFillSettings",
    });

    return sunSeries;
  }

  createWindSeries(root, chart, xAxis, windAxis) {
    const windSeries = chart.series.push(
      am5xy.SmoothedXLineSeries.new(root, {
        name: "Wind Speed",
        xAxis: xAxis,
        yAxis: windAxis,
        valueYField: "windSpeed",
        valueXField: "time",
        tension: 0.3,
      }),
    );

    windSeries.strokes.template.setAll({
      strokeWidth: 3,
      strokeDasharray: [10, 5],
      templateField: "windStrokeSettings",
    });
    windSeries.fills.template.setAll({
      fillOpacity: 0.2,
      visible: true,
      templateField: "windFillSettings",
    });

    return windSeries;
  }

  processData(weatherData) {
    return weatherData;
  }

  getGradientColor(value, base, max, color) {
    const clampedValue = Math.max(0, Math.min(max, value));

    // Normalize to 0-1 range
    const ratio = clampedValue / max;

    // White: RGB(255, 255, 255)
    // Deep Blue: RGB(0, 0, 139)
    let r;
    let g;
    let b;
    let diff;
    if (base > 139) diff = 255 - 139;
    else diff = 139 - 128;

    if (color.includes("r")) r = Math.round(base - diff * ratio);
    else r = Math.round(255 * (1 - ratio));

    if (color.includes("g")) g = Math.round(base - diff * ratio);
    else g = Math.round(255 * (1 - ratio));

    if (color.includes("b")) b = Math.round(base - diff * ratio);
    else b = Math.round(255 * (1 - ratio));

    return am5.color(`rgb(${r}, ${g}, ${b})`);
  }

  prepareChartData(processedData) {
    return processedData.map((item) => ({
      time: item.time.getTime(),
      temperature: item.temperature,
      precipitation: item.precipitation,
      precipitationProb: item.precipitationProb,
      sunHours: item.sunHours,
      sunHoursBase: 0,
      sunHoursBar: 1,
      precipitationBase: 0,
      precipitationBar: 1,
      windSpeed: item.windSpeed,
      sunFillSettings: {
        fill: this.getGradientColor(item.sunHours, 255, 100, "rg"),
      },
      windStrokeSettings: {
        stroke: this.getGradientColor(item.windSpeed, 255, 24, "r"),
      },
      precipFillSettings: {
        fill: this.getGradientColor(item.precipitation, 255, 2, "b"),
      },
    }));
  }

  setSeriesData(series, chartData) {
    series.forEach((s) => s.data.setAll(chartData));
  }

  setupBullets(
    root,
    tempSeries,
    windSeries,
    tempExtremas,
    windExtremas,
    processedData,
  ) {
    this.labelPositions = [];
    this.visibleLabels = [];

    const addBullet = (targetSeries, extremaIndex, value, labelType) => {
      var seriesDataItem = targetSeries.dataItems[extremaIndex];

      if (seriesDataItem) {
        var bullet = am5.Container.new(root, {});

        var circle = bullet.children.push(
          am5.Circle.new(root, {
            radius: 3,
            fill: am5.color(0xffffff),
            stroke: targetSeries.get("stroke"),
            strokeWidth: 3,
            centerY: am5.p50,
            centerX: am5.p50,
          }),
        );

        var label = bullet.children.push(
          am5.Label.new(root, {
            text: value,
            centerX: am5.p50,
            centerY: am5.p100,
            dx: 10,
            dy: 0,
          }),
        );

        const bulletSprite = am5.Bullet.new(root, {
          sprite: bullet,
        });

        targetSeries.addBullet(seriesDataItem, bulletSprite);

        // Store label info for collision detection
        const labelInfo = {
          bullet: bullet,
          label: label,
          extremaIndex: extremaIndex,
          value: value,
          labelType: labelType,
          originalDy: 0,
          visible: true,
        };

        this.labelPositions.push(labelInfo);
        this.visibleLabels.push(labelInfo);
      }
    };

    // Wait for both series to be ready
    let tempReady = false;
    let windReady = false;

    const tryAddBullets = () => {
      if (tempReady && windReady) {
        // Add temperature bullets
        tempExtremas.maxima.forEach((extrema) => {
          const roundedValue = Math.round(
            processedData[extrema.index].temperature,
          );
          const formattedValue = roundedValue + "°";
          addBullet(tempSeries, extrema.index, formattedValue, "temperature");
        });
        tempExtremas.minima.forEach((extrema) => {
          const roundedValue = Math.round(
            processedData[extrema.index].temperature,
          );
          const formattedValue = roundedValue + "°";
          addBullet(tempSeries, extrema.index, formattedValue, "temperature");
        });

        // Add wind bullets
        windExtremas.maxima.forEach((extrema) => {
          const roundedValue = Math.round(
            processedData[extrema.index].windSpeed,
          );
          const formattedValue = roundedValue + "m/s";
          addBullet(windSeries, extrema.index, formattedValue, "wind");
        });
        windExtremas.minima.forEach((extrema) => {
          const roundedValue = Math.round(
            processedData[extrema.index].windSpeed,
          );
          const formattedValue = roundedValue + "m/s";
          addBullet(windSeries, extrema.index, formattedValue, "wind");
        });

        // Handle label collisions after all bullets are added
        setTimeout(() => {
          this.handleLabelCollisions(
            root,
            tempSeries,
            windSeries,
            processedData,
          );
        }, 100);
      }
    };

    tempSeries.events.once("datavalidated", () => {
      tempReady = true;
      tryAddBullets();
    });

    windSeries.events.once("datavalidated", () => {
      windReady = true;
      tryAddBullets();
    });
  }

  handleLabelCollisions(root, tempSeries, windSeries, processedData) {
    if (!this.labelPositions.length) return;

    return;

    console.log("handleLabelCollisions");

    // Sort labels by x position for efficient collision detection
    const sortedLabels = [...this.labelPositions].sort(
      (a, b) => a.extremaIndex - b.extremaIndex,
    );

    // Apply collision detection and repositioning
    for (let i = 0; i < sortedLabels.length; i++) {
      const currentLabel = sortedLabels[i];

      if (!currentLabel.visible) continue;

      // Check for collisions with subsequent labels
      for (let j = i + 1; j < sortedLabels.length; j++) {
        const nextLabel = sortedLabels[j];

        if (!nextLabel.visible) continue;

        // Calculate distance between labels
        const indexDistance = Math.abs(
          nextLabel.extremaIndex - currentLabel.extremaIndex,
        );

        // If labels are too close, apply repositioning or hiding
        if (indexDistance < 4) {
          this.repositionCollidingLabels(currentLabel, nextLabel, root);
        }
      }
    }
  }

  repositionCollidingLabels(label1, label2, root) {
    // Get the actual Y values for the labels to determine which is higher/lower
    const label1YValue = this.getLabelYValue(label1);
    const label2YValue = this.getLabelYValue(label2);

    // Determine which label is topmost (higher Y value = lower on screen in chart coordinates)
    const topmostLabel = label1YValue >= label2YValue ? label1 : label2;
    const bottommostLabel = label1YValue >= label2YValue ? label2 : label1;

    // Move topmost label up (negative offset) and bottommost label down (positive offset)
    const upwardOffset = 0;
    const downwardOffset = 0;

    let repositioned = false;

    // Try to reposition both labels
    if (!this.checkCollisionAtOffset(topmostLabel, upwardOffset)) {
      this.applyLabelOffset(topmostLabel, upwardOffset);
      this.applyLabelOffset(bottommostLabel, downwardOffset);
      repositioned = true;
    }

    if (!this.checkCollisionAtOffset(bottommostLabel, downwardOffset)) {
      this.applyLabelOffset(bottommostLabel, downwardOffset);
      this.applyLabelOffset(topmostLabel, upwardOffset);
      repositioned = true;
    }

    // Last resort: hide the lower priority label (temperature has priority over wind)
    /*
    if (!repositioned) {
      const priority1 = topmostLabel.labelType === "temperature" ? 1 : 0;
      const priority2 = bottommostLabel.labelType === "temperature" ? 1 : 0;
      const lowerPriorityLabel =
        priority1 > priority2 ? bottommostLabel : topmostLabel;
      this.hideLabelConditionally(lowerPriorityLabel);
    }
    */
  }

  getLabelYValue(labelInfo) {
    // Get the data point value to determine vertical position
    const dataIndex = labelInfo.extremaIndex;
    if (labelInfo.labelType === "temperature") {
      return parseFloat(labelInfo.value.replace("°", "")); // Remove degree symbol and convert to number
    } else {
      return parseFloat(labelInfo.value.replace("m/s", "")); // Remove unit and convert to number
    }
  }

  checkCollisionAtOffset(label, dyOffset) {
    // Check if this position would collide with other visible labels
    for (const otherLabel of this.visibleLabels) {
      if (otherLabel === label) continue;

      const indexDistance = Math.abs(
        otherLabel.extremaIndex - label.extremaIndex,
      );
      const verticalDistance = Math.abs(otherLabel.originalDy - dyOffset);

      if (indexDistance < 4 && verticalDistance < 20) {
        return true; // Collision detected
      }
    }
    return false;
  }

  applyLabelOffset(labelInfo, dyOffset) {
    console.log("applyLabelOffset");
    labelInfo.originalDy = dyOffset;
    labelInfo.label.set("dy", dyOffset);

    // Add adaptive positioning based on chart bounds using adapters
    labelInfo.label.adapters.add("dy", (value, target) => {
      if (value < -60) {
        return -60;
      }
      if (value > 60) {
        return 60;
      }
      return value;
    });

    // Adjust anchor point based on offset direction
    if (dyOffset < -30) {
      labelInfo.label.set("centerY", am5.p0); // Position above
      labelInfo.label.set("dx", -10); // Slight horizontal adjustment
    } else if (dyOffset > 30) {
      labelInfo.label.set("centerY", am5.p100); // Position below
      labelInfo.label.set("dx", 10); // Slight horizontal adjustment
    }
  }

  hideLabelConditionally(labelInfo) {
    console.log("hideLabelConditionally");
    labelInfo.visible = false;
    labelInfo.label.set("visible", false);

    // Remove from visible labels tracking
    const index = this.visibleLabels.indexOf(labelInfo);
    if (index > -1) {
      this.visibleLabels.splice(index, 1);
    }
  }

  setupChartEvents(chart, xAxis) {
    self = this;

    chart.events.on("ready", () => {
      xAxis.zoom(0, 0.05);
    });

    /*
    xAxis.onPrivate("selectionMin", function (value, target) {
      if (self.labelPositions && self.labelPositions.length > 0) {
        setTimeout(() => {
          self.recalculateLabelVisibility(xAxis);
        }, 50);
      }
    });
    */
  }

  recalculateLabelVisibility(xAxis) {
    const zoomStart = xAxis.get("start");
    const zoomEnd = xAxis.get("end");
    const visibleRange = zoomEnd - zoomStart;

    // Reset all labels to visible first
    this.labelPositions.forEach((labelInfo) => {
      if (labelInfo.visible === false) {
        labelInfo.visible = true;
        labelInfo.label.set("visible", true);
        labelInfo.label.set("dy", labelInfo.originalDy || 0);
      }
    });

    // Apply conditional visibility based on zoom level
    if (visibleRange > 0.8) {
      console.log("Visible range: " + visibleRange);

      const sortedLabels = [...this.labelPositions].sort(
        (a, b) => a.extremaIndex - b.extremaIndex,
      );
      for (let i = 0; i < sortedLabels.length - 1; i++) {
        const current = sortedLabels[i];
        const next = sortedLabels[i + 1];
        const distance = Math.abs(next.extremaIndex - current.extremaIndex);

        if (distance < 3) {
          this.applyLabelOffset(next, i % 2 === 0 ? -30 : 30);
        }
      }
    }
  }

  findLocalExtrema(timeSeries, property) {
    return this.smoothExtremas(this.extremaSimple(timeSeries, property));
  }

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

  smoothExtremas(extremas) {
    return this.filterExtremasCombined(extremas);
  }

  filterExtremasCombined(extremas) {
    const allExtremas = [
      ...extremas.minima.map((e) => ({ ...e, type: "minimum" })),
      ...extremas.maxima.map((e) => ({ ...e, type: "maximum" })),
    ];

    if (!allExtremas.length) return { minima: [], maxima: [] };

    // Sort by index to process chronologically
    allExtremas.sort((a, b) => a.index - b.index);

    const indexDistanceThreshold = 2;
    const valueThresholdPct = 0.2;
    const valueThresholdValue = 1;

    const result = [];
    let currentGroupPeak = allExtremas[0];

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

  dispose() {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }
}

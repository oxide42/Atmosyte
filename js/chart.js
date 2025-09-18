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
    const precipSeries = this.createPrecipitationSeries(
      root,
      chart,
      xAxis,
      yAxisRight,
    );
    const sunSeries = this.createSunSeries(root, chart, xAxis, windAxis);
    const windSeries = this.createWindSeries(root, chart, xAxis, windAxis);

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
    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: {
          timeUnit: "hour",
          count: 3,
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
        end: 0.3,
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
        visible: false,
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
        visible: false,
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
        tension: 0.3,
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

  createPrecipitationSeries(root, chart, xAxis, yAxisRight) {
    const precipSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Precipitation (mm)",
        xAxis: xAxis,
        yAxis: yAxisRight,
        valueYField: "precipitation",
        valueXField: "time",
        tension: 0.3,
      }),
    );

    precipSeries.columns.template.setAll({
      width: am5.percent(100),
      fill: am5.color(0x0000aa),
      stroke: am5.color(0x0000ff),
      width: am5.percent(100),
      opacity: 0.2,
    });

    return precipSeries;
  }

  createSunSeries(root, chart, xAxis, windAxis) {
    const sunSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: "Sun Hours",
        xAxis: xAxis,
        yAxis: windAxis,
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

  prepareChartData(processedData) {
    return processedData.map((item) => ({
      time: item.time.getTime(),
      temperature: item.temperature,
      precipitation: item.precipitation,
      precipitationProb: item.precipitationProb,
      sunHours: item.sunHours,
      sunHoursBase: 0,
      sunHoursBar: 1,
      windSpeed: item.windSpeed,
      sunFillSettings: {
        fill: am5.color(
          `rgb(${Math.round(item.sunHours * 2.55)}, ${Math.round(item.sunHours * 2.55)}, 0)`,
        ),
        stroke: am5.color(`rgb(255, 255, 0)`),
      },
      windStrokeSettings: {
        stroke: am5.color(
          `rgb(255, ${255 - Math.round(Math.min(item.windSpeed / 24, 1) * 255)}, 255)`,
        ),
      },
      precipStrokeSettings: {
        stroke: am5.color(`rgb(0, 0, 255)`),
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
    const upwardOffset = -40;
    const downwardOffset = 40;

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
    labelInfo.originalDy = dyOffset;
    labelInfo.label.set("dy", dyOffset);

    // Add adaptive positioning based on chart bounds using adapters
    labelInfo.label.adapters.add("dy", (value, target) => {
      try {
        // Simple bounds checking without relying on complex parent hierarchy
        if (value < -60) {
          return -60;
        }
        if (value > 60) {
          return 60;
        }
      } catch (e) {
        // Fallback to simple bounds if there's any error
        if (value < -60) return -60;
        if (value > 60) return 60;
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
    labelInfo.visible = false;
    labelInfo.label.set("visible", false);

    // Remove from visible labels tracking
    const index = this.visibleLabels.indexOf(labelInfo);
    if (index > -1) {
      this.visibleLabels.splice(index, 1);
    }
  }

  setupChartEvents(chart, xAxis) {
    chart.events.on("ready", () => {
      xAxis.zoom(0, 0.05);
    });

    // Recalculate label positions on zoom changes
    xAxis.events.on("selectionchanged", () => {
      if (this.labelPositions && this.labelPositions.length > 0) {
        setTimeout(() => {
          this.recalculateLabelVisibility(xAxis);
        }, 50);
      }
    });
  }

  recalculateLabelVisibility(xAxis) {
    const zoomStart = xAxis.zoom;
    const zoomEnd = xAxis.zoomEnd || 1;
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
    if (visibleRange < 0.1) {
      // High zoom - show more labels with repositioning
      this.applyHighZoomLabelStrategy();
    } else if (visibleRange < 0.3) {
      // Medium zoom - moderate label density
      this.applyMediumZoomLabelStrategy();
    } else {
      // Low zoom - show only most important labels
      this.applyLowZoomLabelStrategy();
    }
  }

  applyHighZoomLabelStrategy() {
    // Show all labels with aggressive repositioning
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

  applyMediumZoomLabelStrategy() {
    // Show labels with moderate filtering
    const sortedLabels = [...this.labelPositions].sort(
      (a, b) => a.extremaIndex - b.extremaIndex,
    );
    for (let i = 0; i < sortedLabels.length - 1; i++) {
      const current = sortedLabels[i];
      const next = sortedLabels[i + 1];
      const distance = Math.abs(next.extremaIndex - current.extremaIndex);

      if (distance < 4) {
        if (current.labelType === "temperature") {
          this.hideLabelConditionally(next);
        } else {
          this.hideLabelConditionally(current);
        }
      }
    }
  }

  applyLowZoomLabelStrategy() {
    // Show only high-priority labels with significant spacing
    const tempLabels = this.labelPositions.filter(
      (l) => l.labelType === "temperature",
    );
    const windLabels = this.labelPositions.filter(
      (l) => l.labelType === "wind",
    );

    // Keep only temperature labels that are far apart
    for (let i = 1; i < tempLabels.length; i++) {
      const distance = Math.abs(
        tempLabels[i].extremaIndex - tempLabels[i - 1].extremaIndex,
      );
      if (distance < 8) {
        this.hideLabelConditionally(tempLabels[i]);
      }
    }

    // Hide most wind labels in low zoom
    windLabels.forEach((label, index) => {
      if (index % 2 === 1) {
        this.hideLabelConditionally(label);
      }
    });
  }

  findLocalExtrema(timeSeries, property) {
    //return this.smoothExtremas(this.extremaSimple(timeSeries, property));

    const dataPoints = [];
    for (let i = 0; i < timeSeries.length; i++) {
      dataPoints.push(timeSeries[i][property]);
    }

    return this.findExtremaByProminence(dataPoints);
  }

  findExtremaByProminence(data, minProminence = 0.3) {
    const maxima = [];
    const minima = [];

    for (let i = 1; i < data.length - 1; i++) {
      // Check for maximum
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        const prominence = this.calculateProminence(data, i, "max");
        if (prominence >= minProminence) {
          maxima.push({ index: i, prominence, height: data[i] });
        }
      }
      // Check for minimum
      else if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
        const prominence = this.calculateProminence(data, i, "min");
        if (prominence >= minProminence) {
          minima.push({ index: i, prominence, height: data[i] });
        }
      }
    }

    return { maxima, minima };
  }

  calculateProminence(data, peakIndex, type) {
    if (type === "max") {
      // For maxima: find lowest points on either side
      let leftBase = data[peakIndex];
      for (let j = peakIndex - 1; j >= 0; j--) {
        if (data[j] <= data[j + 1]) leftBase = Math.min(leftBase, data[j]);
        else break;
      }

      let rightBase = data[peakIndex];
      for (let j = peakIndex + 1; j < data.length; j++) {
        if (data[j] <= data[j - 1]) rightBase = Math.min(rightBase, data[j]);
        else break;
      }

      return data[peakIndex] - Math.max(leftBase, rightBase);
    } else {
      // For minima: find highest points on either side
      let leftBase = data[peakIndex];
      for (let j = peakIndex - 1; j >= 0; j--) {
        if (data[j] >= data[j + 1]) leftBase = Math.max(leftBase, data[j]);
        else break;
      }

      let rightBase = data[peakIndex];
      for (let j = peakIndex + 1; j < data.length; j++) {
        if (data[j] >= data[j - 1]) rightBase = Math.max(rightBase, data[j]);
        else break;
      }

      return Math.min(leftBase, rightBase) - data[peakIndex];
    }
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
      if (
        current >= prev &&
        current >= next &&
        (i === 0 || i === length - 1 || current > prev || current > next)
      ) {
        maxima.push(point);
      }
      // Check for minimum
      else if (
        current <= prev &&
        current <= next &&
        (i === 0 || i === length - 1 || current < prev || current < next)
      ) {
        minima.push(point);
      }
    }

    return {
      minima: minima,
      maxima: maxima,
    };
  }

  smoothExtremas(extremas) {
    return {
      minima: this.filterGroups(extremas.minima, true),
      maxima: this.filterGroups(extremas.maxima, false),
    };
  }

  filterGroups(extrema, isMinima) {
    if (!extrema.length) return [];

    const indexDistanceThreshold = 3;
    const valueThreshold = 0.3;

    const result = [];
    let currentGroupPeak = extrema[0];

    for (let i = 1; i < extrema.length; i++) {
      const { index: currIdx, value: currVal } = extrema[i];
      const { index: prevIdx, value: prevVal } = extrema[i - 1];

      const isCloseInIndex = currIdx - prevIdx <= indexDistanceThreshold;
      const isCloseInValue =
        Math.abs((currVal - prevVal) / currVal) <= valueThreshold;

      if (isCloseInIndex && isCloseInValue) {
        // Keep more extreme value within the group
        const isMoreExtreme = isMinima
          ? currVal < currentGroupPeak.value
          : currVal > currentGroupPeak.value;

        if (isMoreExtreme) currentGroupPeak = extrema[i];
      } else {
        result.push(currentGroupPeak);
        currentGroupPeak = extrema[i];
      }
    }
    result.push(currentGroupPeak);
    return result;
  }

  dispose() {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }
}

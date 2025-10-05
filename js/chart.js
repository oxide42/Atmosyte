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
    const chartData = this.prepareChartData(processedData);

    this.setSeriesData(
      [tempSeries, precipSeries, windSeries, sunSeries],
      chartData,
    );
    this.setupBullets(
      root,
      tempSeries,
      windSeries,
      sunSeries,
      precipSeries,
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
        extraMin: 0.35,
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
        extraMax: 0.6,
        extraMin: 0.01,
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

  createPrecipitationSeries(root, chart, xAxis, yAxis) {
    const precipSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: "Precipitation",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "precipitationBar",
        openValueYField: "precipitationBase",
        valueXField: "time",
      }),
    );

    precipSeries.fills.template.setAll({
      fillOpacity: 0.2,
      visible: true,
      templateField: "precipFillSettings",
    });

    return precipSeries;
  }

  createSunSeries(root, chart, xAxis, yAxis) {
    const sunSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        name: "Sun",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "sunHoursBar",
        openValueYField: "sunHoursBase",
        valueXField: "time",
      }),
    );

    sunSeries.fills.template.setAll({
      fillOpacity: 0.2,
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
        valueXField: "time",
        valueYField: "windSpeed",
        openValueYField: "windBase",
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

  gradientColor(value, min, max, colorLow, colorHigh) {
    const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const toRgb = (c) => parseInt(c.slice(1), 16);
    const r1 = (toRgb(colorLow) >> 16) & 0xff,
      g1 = (toRgb(colorLow) >> 8) & 0xff,
      b1 = toRgb(colorLow) & 0xff;
    const r2 = (toRgb(colorHigh) >> 16) & 0xff,
      g2 = (toRgb(colorHigh) >> 8) & 0xff,
      b2 = toRgb(colorHigh) & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  prepareChartData(processedData) {
    return processedData.map((item) => ({
      time: item.time.getTime(),
      temperature: item.temperature,
      precipitation: item.precipitation,
      precipitationProb: item.precipitationProb,
      sunHours: item.sunHours,
      sunHoursBase: 0,
      sunHoursBar: 0.5,
      precipitationBase: 0,
      precipitationBar: 1,
      windBase: 0,
      windSpeed: item.windSpeed,
      sunFillSettings: {
        fill: this.gradientColor(item.sunHours, 0, 50, "#888888", "#ffff22"),
      },
      windStrokeSettings: {
        stroke: this.gradientColor(item.windSpeed, 0, 24, "#ffffff", "#ff0000"),
      },
      precipFillSettings: {
        stroke: item.precipitation < 0.01 ? "#FFFFFF" : "#afafaf",
        fill: this.gradientColor(
          item.precipitation,
          0,
          10,
          "#ffffff",
          "#0000ff",
        ),
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
    sunSeries,
    precipSeries,
    processedData,
  ) {
    this.labelPositions = [];
    this.visibleLabels = [];

    const addLabel = (container, text, centerX, centerY, dx, dy) => {
      const label = container.children.push(
        am5.Label.new(root, {
          text: text,
          centerX: centerX,
          centerY: centerY,
          dx: dx,
          dy: dy,
        }),
      );
      return label;
    };

    const addBullet = (
      targetSeries,
      extremaIndex,
      value,
      labelType,
      centerX = am5.p50,
      centerY = am5.p100,
    ) => {
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

        var label = addLabel(bullet, value, centerX, centerY, 10, 0);

        this.labelPositions.push(label);
        this.visibleLabels.push(label);

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
      // Sun label
      const sunContainer = am5.Container.new(root, {});
      const label = addLabel(sunContainer, "☀", am5.p0, am5.p50, 0, 7);
      const bulletSprite = am5.Bullet.new(root, {
        sprite: sunContainer,
      });
      sunSeries.addBullet(sunSeries.dataItems[0], bulletSprite);

      // Precipitation label
      const precipContainer = am5.Container.new(root, {});
      const precipLabel = addLabel(
        precipContainer,
        "⛈",
        am5.p0,
        am5.p50,
        0,
        7,
      );
      const precipBulletSprite = am5.Bullet.new(root, {
        sprite: precipContainer,
      });
      precipSeries.addBullet(precipSeries.dataItems[0], precipBulletSprite);

      if (tempReady && windReady) {
        // Add bullets based on extremas property
        processedData.forEach((dataPoint, index) => {
          if (dataPoint.extremas) {
            // Add temperature bullets
            if (
              dataPoint.extremas.isMinima?.includes("temperature") ||
              dataPoint.extremas.isMaxima?.includes("temperature")
            ) {
              const roundedValue = Math.round(dataPoint.temperature);
              const formattedValue = roundedValue + "°";
              addBullet(tempSeries, index, formattedValue, "temperature");
            }

            // Add wind bullets
            if (
              dataPoint.extremas.isMinima?.includes("windSpeed") ||
              dataPoint.extremas.isMaxima?.includes("windSpeed")
            ) {
              const roundedValue = Math.round(dataPoint.windSpeed);
              const formattedValue =
                roundedValue + " " + this.settings.getWindSpeedUnit();
              addBullet(windSeries, index, formattedValue, "wind");
            }

            // Add precipitation bullets
            if (dataPoint.extremas.isMaxima?.includes("precipitation")) {
              const roundedValue = Math.round(dataPoint.precipitation);
              const formattedValue = roundedValue;
              addBullet(
                precipSeries,
                index,
                formattedValue,
                "precipitation",
                am5.p50,
                am5.p0,
              );
            }
          }
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

  dispose() {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  }
}

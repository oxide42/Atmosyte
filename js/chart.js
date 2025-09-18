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

    // Smooth extrema data points
    tempExtremas = this.smoothExtremas(tempExtremas);
    windExtremas = this.smoothExtremas(windExtremas);

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
    const addBullet = (targetSeries, extremaIndex, value) => {
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
          }),
        );

        targetSeries.addBullet(
          seriesDataItem,
          am5.Bullet.new(root, {
            sprite: bullet,
          }),
        );
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
          addBullet(tempSeries, extrema.index, formattedValue);
        });
        tempExtremas.minima.forEach((extrema) => {
          const roundedValue = Math.round(
            processedData[extrema.index].temperature,
          );
          const formattedValue = roundedValue + "°";
          addBullet(tempSeries, extrema.index, formattedValue);
        });

        // Add wind bullets
        windExtremas.maxima.forEach((extrema) => {
          const roundedValue = Math.round(
            processedData[extrema.index].windSpeed,
          );
          const formattedValue = roundedValue + "m/s";
          addBullet(windSeries, extrema.index, formattedValue);
        });
        windExtremas.minima.forEach((extrema) => {
          const roundedValue = Math.round(
            processedData[extrema.index].windSpeed,
          );
          const formattedValue = roundedValue + "m/s";
          addBullet(windSeries, extrema.index, formattedValue);
        });
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

  setupChartEvents(chart, xAxis) {
    chart.events.on("ready", () => {
      xAxis.zoom(0, 0.05);
    });
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

    return { minima, maxima };
  }

  findLocalExtrema(timeSeries, property) {
    return this.extremaSimple(timeSeries, property);
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

import { useEffect, useRef } from "react";
import * as d3 from "d3";

function CheaterHeatmap({ data, width, height }) {
  const svgRef = useRef(null);
  const AVERAGE_SPENT = 150; // Known average

  useEffect(() => {
    if (!data || !data.length) {
      console.warn("No data available for the heatmap.");
      return;
    }

    // 1) Process data into (itemsInCart, totalSpent, orderNumber)
    const orders = data.map((order) => ({
      itemsInCart: d3.sum(order.items, (d) => d.quantity),
      totalSpent: d3.sum(order.items, (d) => d.total),
      orderNumber: order.orderNumber,
    }));

    // 2) Define bins
    const uniqueCartCounts = Array.from(
      new Set(orders.map((o) => o.itemsInCart))
    ).sort((a, b) => a - b);

    const binSize = 15; // Smaller bins for more contrast
    const maxSpent = d3.max(orders, (d) => d.totalSpent) || 0;
    const yBins = d3.range(0, Math.ceil(maxSpent / binSize) + 1).map(
      (i) => i * binSize
    );

    // 3) Aggregate (xBin, yBin) counts and orders
    const binMap = new Map();
    orders.forEach((o) => {
      const xVal = o.itemsInCart;
      const yValStart = Math.floor(o.totalSpent / binSize) * binSize;
      const key = `${xVal}-${yValStart}`;

      if (!binMap.has(key)) {
        binMap.set(key, { count: 0, orderNumbers: [] });
      }
      const binInfo = binMap.get(key);
      binInfo.count += 1;
      binInfo.orderNumbers.push(o.orderNumber);
    });

    const aggregatedData = [];
    uniqueCartCounts.forEach((xBin) => {
      yBins.forEach((yBinStart) => {
        const key = `${xBin}-${yBinStart}`;
        const { count = 0, orderNumbers = [] } = binMap.get(key) || {};
        aggregatedData.push({
          xBin,
          yBinStart,
          count,
          orderNumbers,
          deviation: Math.abs(yBinStart - AVERAGE_SPENT), // Track deviation from $150
        });
      });
    });

    // 4) Create SVG and Container
    const margin = { top: 20, right: 20, bottom: 50, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const container = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // 5) Define Scales
    const xScale = d3
      .scaleBand()
      .domain(uniqueCartCounts)
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(yBins.map(String))
      .range([innerHeight, 0])
      .padding(0.05);

    // 6) **LOG COLOR SCALE** (Fix faint colors)
    const maxCount = d3.max(aggregatedData, (d) => d.count) || 1;
    const colorScale = d3
      .scaleLog()
      .domain([1, maxCount])
      .range(["#242424", "#36BDF7"])
      .clamp(true);

    // 7) **Stronger color for large deviations**
    const deviationScale = d3
      .scaleLinear()
      .domain([0, d3.max(aggregatedData, (d) => d.deviation) || 1])
      .range(["#242424", "#F79E36"]); // Orders far from $150 will be more visible

    // 8) Draw Heatmap Cells
    container
      .selectAll("rect")
      .data(aggregatedData)
      .join("rect")
      .attr("x", (d) => xScale(d.xBin))
      .attr("y", (d) => yScale(String(d.yBinStart)))
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) =>
        d.count === 1
          ? deviationScale(d.deviation) // If low count, show deviation color
          : colorScale(d.count)
      )
      .attr("stroke", "#333");

    // 9) Axes
    container
      .append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .text("Items in Cart");

    container
      .append("g")
      .call(
        d3.axisLeft(yScale).tickFormat((d) => `${d} - ${+d + binSize}`)
      )
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .text("Total Amount Spent ($ binned)");

    // 10) Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "white")
      .style("color", "black")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("padding", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    container
      .selectAll("rect")
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(`
            <strong>Items in Cart:</strong> ${d.xBin}<br/>
            <strong>Total \$ Bin:</strong> ${d.yBinStart} - ${
            d.yBinStart + binSize
          }<br/>
            <strong>Count:</strong> ${d.count}<br/>
            <strong>Order Numbers:</strong><br/>
            ${d.orderNumbers.length
              ? d.orderNumbers.join("<br/>")
              : "None in this bin"}
          `);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    return () => tooltip.remove();
  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

export default CheaterHeatmap;

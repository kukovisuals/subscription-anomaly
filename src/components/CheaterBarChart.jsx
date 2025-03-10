import { useEffect, useRef } from "react";
import * as d3 from "d3";

function CheaterBarChart({ data, width, height }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("No valid data for visualization.");
      return;
    }

    console.log("Visualizing Cheater Data:", data);
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 80, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Prepare the data
    const processedData = data.map((order) => ({
      orderNumber: order.orderNumber,
      freePanties: order.freePanties,
      freeBras: order.freeBras,
      expectedFreePanties: order.expectedFreePanties,
      expectedFreeBras: order.expectedFreeBras,
      isCheater:
        order.freePanties > order.expectedFreePanties ||
        order.freeBras > order.expectedFreeBras,
    }));

    // Define Scales
    const xScale = d3
      .scaleBand()
      .domain(processedData.map((d) => d.orderNumber))
      .range([0, innerWidth])
      .padding(0.2);

    const yMax = d3.max([
      ...processedData.map((d) => d.freePanties),
      ...processedData.map((d) => d.freeBras),
    ]);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]).nice();

    // Append Main Group
    const chartGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Color scale
    const colorScale = d3.scaleOrdinal().domain(["normal", "cheater"]).range(["#4caf50", "#e53935"]);

    // Draw Bars
    chartGroup
      .selectAll("rect")
      .data(processedData)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.orderNumber))
      .attr("y", (d) => yScale(d.freePanties + d.freeBras))
      .attr("height", (d) => innerHeight - yScale(d.freePanties + d.freeBras))
      .attr("width", xScale.bandwidth())
      .attr("fill", (d) => (d.isCheater ? colorScale("cheater") : colorScale("normal")))
      .append("title")
      .text(
        (d) =>
          `Order: ${d.orderNumber}\nFree Panties: ${d.freePanties}/${d.expectedFreePanties}\nFree Bras: ${d.freeBras}/${d.expectedFreeBras}\nCheater: ${
            d.isCheater ? "Yes 🚨" : "No ✅"
          }`
      );

    // Axes
    chartGroup
      .append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-45)");

    chartGroup.append("g").call(d3.axisLeft(yScale));

    // Legend
    const legend = svg.append("g").attr("transform", `translate(${innerWidth - 120},${margin.top})`);
    ["normal", "cheater"].forEach((key, i) => {
      const legendRow = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
      legendRow.append("rect").attr("width", 15).attr("height", 15).attr("fill", colorScale(key));
      legendRow
        .append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(key === "cheater" ? "Cheaters 🚨" : "Legit Orders ✅")
        .style("font-size", "12px");
    });
  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

export default CheaterBarChart;

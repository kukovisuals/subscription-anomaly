import { useEffect, useRef } from "react";
import * as d3 from "d3";

function StackReviews({ data, width, height }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("No valid data for visualization.");
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 30, bottom: 80, left: 270 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xExtent = d3.extent(data.map(d => d.sentiment_score));
    const yDomain = data.map(d => d.product);
    const sizeExtent = d3.extent(data.map(d => d.count));

    const xScale = d3
      .scaleLinear()
      .domain(xExtent)
      .range([0, innerWidth]);

    const yScale = d3
      .scalePoint()
      .domain(yDomain)
      .range([0, innerHeight])
      .padding(0.5); // Space between points

    const rScale = d3
      .scaleSqrt()
      .domain(sizeExtent)
      .range([4, 20]); // Adjust sizes as needed

    const chartGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Y axis (products)
    chartGroup.append("g")
      .call(d3.axisLeft(yScale));

    // X axis (sentiment)
    chartGroup.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    // Circles as scatter points
    chartGroup.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.sentiment_score))
      .attr("cy", d => yScale(d.product))
      .attr("r", d => rScale(d.count))
      .attr("fill", d => d.sentiment_score >= 0 ? "#4CAF50" : "#F44336")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .append("title")
      .text(d => `${d.product}\nSentiment: ${d.sentiment_score.toFixed(2)}\nReviews: ${d.count}`);
  }, [data, width, height]);


  return <svg ref={svgRef} width={width} height={height} />;
}

export default StackReviews;

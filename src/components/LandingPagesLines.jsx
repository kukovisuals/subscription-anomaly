// LandingPagesLine.jsx

import { useEffect } from "react";
import * as d3 from "d3";

function LandingPagesLine({ data, containerId }) {
    useEffect(() => {
        if (!data || data.length === 0) return;

        drawChart(data);
    }, [data]);

    function drawChart(data) {
        d3.select(`#${containerId}`).selectAll("*").remove();

        const margin = { top: 10, right: 300, bottom: 30, left: 60 },
            width = 900 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        const svg = d3
            .select(`#${containerId}`)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const groupedCVRData = d3.group(data, (d) => d.name);

        data.forEach((d) => {
            // example: parse the date string
            d.year = new Date(d.year);   // or parseTime if you need it
            d["cartAdditions"] = +d["cartAdditions"];  // ensure numeric
            d.cvr = +d.cvr;              // also ensure numeric if needed
        });

        // 3) GET ALL UNIQUE 'name' VALUES (these become stacked "keys")
        const allNames = Array.from(new Set(data.map((d) => d.name)));

        const dataByYear = d3
            .rollups(
                data,
                (v) => {
                    // v is the array of rows for this particular year
                    // Build an object that has each "name" as a property
                    const rowObj = {};
                    v.forEach((d) => {
                        rowObj[d.name] = d["cartAdditions"];
                    });
                    rowObj.cvr = d3.mean(v, (d) => d.cvr);
                    // We'll also store the actual date (or year string) itself
                    rowObj.year = v[0].year;
                    return rowObj;
                },
                (d) => d.year
            )
            // rollups() returns an array of [key, value], so map it to just the objects:
            .map(([year, obj]) => obj);


        dataByYear.sort((a, b) => a.year - b.year);

        const x = d3
            .scaleTime()
            .domain(d3.extent(dataByYear, (d) => d.year))
            .range([0, width]);

        svg
            .append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x).ticks(2));

        const myColors = [
            "#BFBFBF", // Vibrant Red FF006E verde 015958
            "#015958", // Orange BFBFBF
            "#FF006E", // Yellow
            "#BFBFBF", // Teal 3498DB
            "#BFBFBF", // Deep Blue E63946
            "#BFBFBF", // Deep Purple
            "#BFBFBF", // Bright Blue 0FC2C0
            "#BFBFBF", // Hot Pink
            "#FB5607", // Fiery Orange
            "#06D6A0", // Bright Green
            "#118AB2", // Ocean Blue
            "#73A857", // Leaf Green
            "#FFBE0B", // Golden Yellow
            "#8E44AD", // Royal Purple
            "#3498DB", // Sky Blue
            "#D81159", // Rose Red
            "#D7263D", // Strong Red
            "#FF4500", // Strong Orange
            "#00A6ED", // Electric Blue
            "#FF4D6D", // Soft Coral
        ];

        // 9) COLOR PALETTE FOR THE LAYERS
        const color = d3.scaleOrdinal().domain(allNames).range(myColors); // or any palette you like

        const legend = svg
            .selectAll(".legend")
            .data(allNames)
            .enter()
            .append("g")
            .attr("class", "legend")
            // Shift each item downward so they don't overlap
            .attr("transform", (d, i) => `translate(30, ${i * 20})`);

        // 2) Draw a small colored square for each name
        // legend
        //     .append("rect")
        //     .attr("x", width + 30) // position to the right of the chart
        //     .attr("y", 10) // small top margin
        //     .attr("width", 10)
        //     .attr("height", 10)
        //     .style("fill", (d) => color(d));

        // 3) Add text labels next to each colored square
        // legend
        //     .append("text")
        //     .attr("x", width + 50) // a bit more to the right of the rectangle
        //     .attr("y", 18) // roughly in the middle of the rectangle
        //     .attr("text-anchor", "start")
        //     .style("alignment-baseline", "middle")
        //     .style("font-size", "12px")
        //     .text((d) => d);

        const yRight = d3
            .scaleLinear()
            .domain([0, d3.max(data, (d) => d.cvr) * 1.2]) // Scale up for better spacing
            .range([height, 0]);

        // 1️⃣ Append the right Y-axis for CVR
        svg.append("g").call(d3.axisLeft(yRight)); // Call the right-side axis

        svg.append("text")
            .attr("x", -height / 2) // Center the label along the axis
            .attr("y", -40) // Move it away from the axis for spacing
            .attr("transform", "rotate(-90)") // Rotate the text vertically
            .attr("text-anchor", "middle") // Center the text alignment
            .style("font-size", "14px")
            .style("fill", "#000") // Change color if needed
            .text("CVR %"); // Set the label text

        // 1️⃣ Create a tooltip div (hidden by default)
        // const tooltip = d3
        //     .select("body")
        //     .append("div")
        //     .style("position", "absolute")
        //     .style("background", "rgba(0, 0, 0, 0.8)")
        //     .style("color", "white")
        //     .style("padding", "8px 12px")
        //     .style("border-radius", "5px")
        //     .style("font-size", "12px")
        //     .style("pointer-events", "none") // Ensures it doesn't interfere with mouse events
        //     .style("opacity", 0); // Initially hidden

        // 1) Determine the very last date in the entire dataset
        //    (You already sorted dataByYear, so the last entry has the max date)
        const allDates = dataByYear.map(d => d.year);
const lastDate = d3.max(allDates);

// Keep track of used y-positions
const usedYPositions = [];

groupedCVRData.forEach((values, name) => {
    values.sort((a, b) => a.year - b.year);

    const lastPoint = values[values.length - 1];
    const lastCVR = lastPoint.cvr;
    let lineColor;

    if (lastCVR > 2) {
        lineColor = "#012619";
    } else if (lastCVR < 2) {
        lineColor = "#8C0B0B";
    } else {
        lineColor = "#C2C5C8";
    }

    // Draw the line
    svg.append("path")
        .datum(values)
        .attr("fill", "none")
        .attr("stroke", lineColor)
        .attr("stroke-width", 2)
        .attr(
            "d",
            d3.line()
                .x((d) => x(d.year))
                .y((d) => yRight(d.cvr))
        );

    // Draw circle markers
    svg.selectAll(`.cvr-dot-${name.replace(/\W/g, "")}`)
        .data(values)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => yRight(d.cvr))
        .attr("r", 5)
        .attr("fill", lineColor)
        .attr("stroke", "white")
        .attr("stroke-width", 1);

    // Only add label if it has data for the last date
    if (+lastPoint.year === +lastDate) {
        if (lastCVR > 2 || lastCVR < 2) {
        
            let labelY = yRight(lastPoint.cvr);
            
            // Adjust label position to avoid overlapping
            while (usedYPositions.some(y => Math.abs(y - labelY) < 10)) {
                labelY += 20;  // Move it downward
            }
    
            usedYPositions.push(labelY); // Store the new Y position
    
            // Add text label
            svg.append("text")
                .attr("x", x(lastPoint.year) + 8)  // Shift right
                .attr("y", labelY)
                .attr("dy", "0.35em")  // Vertical centering
                .attr("fill", lineColor)
                .attr("font-size", "12px")
                .text(`${name} (${lastPoint.cvr.toFixed(2)}%)`);
        }
    }
});

    }

    return <div id={containerId} />;
}

export default LandingPagesLine;

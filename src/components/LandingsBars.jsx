// LandingPagesBar.jsx

import { useEffect } from "react";
import * as d3 from "d3";

function LandingPagesBar({ data, containerId }) {
    useEffect(() => {
        if (!data || data.length === 0) return;

        drawChart(data);
    }, [data]);

    function drawChart(data) {
        d3.select(`#${containerId}`).selectAll("*").remove();

        console.log(data);

        const margin = { top: 20, right: 50, bottom: 80, left: 180 },
            width = 1000 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;

        const svg = d3
            .select(`#${containerId}`)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Parse dates and find the latest date
        data.forEach((d) => {
            d.year = new Date(d.year);
            d.n = +d.n;
            d.cvr = +d.cvr;
        });

        // Find the latest date in the dataset
        const latestDate = d3.max(data, d => d.year);
        
        // Filter data to only include the latest date
        const latestDayData = data.filter(d => +d.year === +latestDate);

        // Process data - group by landing page name for latest day only
        const sessionsByPage = d3.rollups(
            latestDayData,
            (v) => ({
                sessions: d3.sum(v, (d) => d.n),
                cvr: d3.mean(v, (d) => d.cvr)
            }),
            (d) => d.name
        );

        // Convert to array of objects and sort by sessions descending
        const processedData = sessionsByPage
            .map(([name, { sessions, cvr }]) => ({ name, sessions, cvr }))
            .sort((a, b) => b.sessions - a.sessions);

        // Create scales - switched X and Y
        const y = d3
            .scaleBand()
            .domain(processedData.map(d => d.name))
            .range([0, height])
            .padding(0.1);

        const x = d3
            .scaleLinear()
            .domain([0, d3.max(processedData, d => d.sessions)])
            .nice() // Makes the scale endpoints nicer
            .range([0, width]);

        // Color based on CVR performance
        const getBarColor = (cvr) => {
            if (cvr > 2) {
                return "#115923"; // Green for good CVR
            } else {
                return "#ff5151"; // Red for poor CVR
            }
        };

        // Add X axis (sessions)
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x).ticks(3));

        // Add Y axis (landing page names)
        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", "10px");

        // Add X axis label (sessions)
        svg.append("text")
            .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 40})`)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#000")
            .text("Sessions");


        // Add bars - now horizontal
        svg.selectAll(".bar")
            .data(processedData)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", d => y(d.name))
            .attr("width", d => x(d.sessions))
            .attr("height", y.bandwidth())
            .attr("fill", d => getBarColor(d.cvr))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .style("font-size", "10px")
            .on("mouseover", function(event, d) {
                // Highlight bar on hover
                d3.select(this)
                    .attr("opacity", 0.8)
                    .attr("stroke-width", 2);

                // Add tooltip
                const tooltip = svg.append("g")
                    .attr("class", "tooltip");

                const rect = tooltip.append("rect")
                    .attr("fill", "rgba(0,0,0,0.8)")
                    .attr("rx", 4);

                const text = tooltip.append("text")
                    .attr("fill", "white")
                    .attr("font-size", "12px")
                    .attr("text-anchor", "middle");

                text.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .text(d.name);

                text.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .text(`Sessions: ${d.sessions.toLocaleString()}`);

                text.append("tspan")
                    .attr("x", 0)
                    .attr("dy", "1.2em")
                    .text(`CVR: ${d.cvr.toFixed(2)}%`);

                const bbox = text.node().getBBox();
                rect.attr("x", bbox.x - 8)
                    .attr("y", bbox.y - 4)
                    .attr("width", bbox.width + 16)
                    .attr("height", bbox.height + 8);

                const [mouseX, mouseY] = d3.pointer(event, svg.node());
                tooltip.attr("transform", `translate(${mouseX}, ${mouseY - 40})`);
            })
            .on("mouseout", function() {
                // Remove highlight
                d3.select(this)
                    .attr("opacity", 1)
                    .attr("stroke-width", 1);

                // Remove tooltip
                svg.select(".tooltip").remove();
            });

        // Add value labels at the end of bars
        svg.selectAll(".value-label")
            .data(processedData)
            .enter()
            .append("text")
            .attr("class", "value-label")
            .attr("x", d => x(d.sessions) + 5)
            .attr("y", d => y(d.name) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .style("font-size", "14px")
            .style("fill", "#333")
            .text(d => d.sessions.toLocaleString());

        // Add title with latest date
        const dateFormatter = d3.timeFormat("%B %d, %Y");
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("fill", "#333");
    }

    return <div id={containerId} />;
}

export default LandingPagesBar;
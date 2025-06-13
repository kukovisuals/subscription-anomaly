import { useEffect } from "react";
import * as d3 from "d3";

function MarketingScatter({ data, containerId }) {
    useEffect(() => {
        if (!data || Object.keys(data).length === 0) return;
        drawScatter(data);
    }, [data]);

    function drawScatter(summary) {
        d3.select(`#${containerId}`).selectAll("*").remove();

        const margin = { top: 40, right: 50, bottom: 80, left: 60 },
            width = 900 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        const svg = d3
            .select(`#${containerId}`)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Flatten to one array of { path, channel, cvr, sessions }
        const allPoints = [];

        for (const path in summary) {
            const { channels } = summary[path];
            for (const ch in channels) {
                const { cvr, sessions } = channels[ch];
                allPoints.push({
                    path,
                    channel: ch,
                    cvr,
                    sessions,
                });
            }
        }

        // Scales
        const x = d3
            .scaleBand()
            .domain([...new Set(allPoints.map(d => d.channel))])
            .range([0, width])
            .padding(0.2);

        const y = d3
            .scaleLinear()
            .domain([0, d3.max(allPoints, d => d.cvr) * 1.2])
            .range([height, 0])
            .nice();

        const r = d3
            .scaleSqrt()
            .domain([0, d3.max(allPoints, d => d.sessions)])
            .range([4, 25]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        svg.append("g")
            .call(d3.axisLeft(y));

        // Circles
        svg.selectAll(".dot")
            .data(allPoints)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.channel) + x.bandwidth() / 2)
            .attr("cy", d => y(d.cvr))
            .attr("r", d => r(d.sessions))
            .attr("fill", "#5D76A9")
            .attr("opacity", 0.7)
            .attr("stroke", "#333")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("stroke-width", 2).attr("opacity", 1);

                const tooltip = svg.append("g").attr("class", "tooltip");

                const box = tooltip
                    .append("rect")
                    .attr("fill", "black")
                    .attr("rx", 4)
                    .attr("opacity", 0.8);

                const label = tooltip
                    .append("text")
                    .attr("fill", "white")
                    .attr("font-size", 12)
                    .attr("text-anchor", "middle");

                label.append("tspan").text(d.channel).attr("x", 0).attr("dy", "1.2em");
                label.append("tspan")
                    .text(`CVR: ${d.cvr.toFixed(2)}%`)
                    .attr("x", 0)
                    .attr("dy", "1.2em");
                label.append("tspan")
                    .text(`Sessions: ${d.sessions}`)
                    .attr("x", 0)
                    .attr("dy", "1.2em");

                const bbox = label.node().getBBox();
                box.attr("x", bbox.x - 8)
                    .attr("y", bbox.y - 4)
                    .attr("width", bbox.width + 16)
                    .attr("height", bbox.height + 8);

                const [mouseX, mouseY] = d3.pointer(event, svg.node());
                tooltip.attr("transform", `translate(${mouseX},${mouseY - 60})`);
            })
            .on("mouseout", function () {
                d3.select(this).attr("stroke-width", 1).attr("opacity", 0.7);
                svg.select(".tooltip").remove();
            });

        // Title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Channel CVR Scatter Plot (Bubble Size = Sessions)");

        // Y Label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Conversion Rate (%)");

        // X Label
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Marketing Channel");
    }

    return <div id={containerId} />;
}

export default MarketingScatter;

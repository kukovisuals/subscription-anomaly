import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Marketing Campaign Scatter Plot
 * Shows CVR vs Sessions to identify best performing campaigns
 *
 * @param {Array} data - Array of marketing campaign data objects
 * @param {number} width - The width of the SVG
 * @param {number} height - The height of the SVG
 */
function MarketingScatter({ data, width = 1200, height = 600 }) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || !data.length) {
            console.warn("No data available for the scatter plot.");
            return;
        }

        // Filter out invalid data and prepare scatter data
        const scatterData = data
            .filter(d => d.session && d.cvr !== undefined)
            .map((campaign, i) => ({
                index: i,
                landing: campaign.landing,
                channel: campaign.channel,
                name: campaign.name,
                cvr: Number(campaign.cvr) || 0,
                sessions: Number(campaign.session) || 0,
                campaign: campaign.sources?.campaign || 'No Campaign',
                influencer: campaign.sources?.influencer || null,
                state: campaign.state,
                isPaid: campaign.sources?.is_paid || false,
                medium: campaign.sources?.medium || 'Unknown'
            }))
            .filter(d => {
                return d.channel !== "direct" && d.landing.includes("/collections/best-sellers") && d.cvr < 2;
            }); 

        if (scatterData.length === 0) {
            console.warn("No valid data points for visualization.");
            return;
        }

        // Setup canvas
        const margin = { top: 20, right: 150, bottom: 60, left: 80 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Clear previous content
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const container = svg
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Define scales
        const xExtent = d3.extent(scatterData, d => d.sessions);
        const xScale = d3
            .scaleLinear()
            .domain([0, xExtent[1] * 1.1]) // Add 10% padding
            .range([0, innerWidth])
            .nice();

        const yExtent = d3.extent(scatterData, d => d.cvr);
        const yScale = d3
            .scaleLinear()
            .domain([0, Math.max(yExtent[1] * 1.1, 5)]) // Ensure we see at least 5% CVR
            .range([innerHeight, 0])
            .nice();

        // Color scale by channel
        const channels = [...new Set(scatterData.map(d => d.channel))];
        const colorScale = d3
            .scaleOrdinal(d3.schemeCategory10)
            .domain(channels);

        // Size scale based on sessions (optional secondary encoding)
        const sizeScale = d3
            .scaleSqrt()
            .domain([0, d3.max(scatterData, d => d.sessions)])
            .range([4, 15]);

        // Create axes
        const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
        const yAxis = d3.axisLeft(yScale).tickFormat(d => d + "%");

        // Add axes
        container
            .append("g")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(xAxis)
            .append("text")
            .attr("class", "axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", 45)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .style("font-size", "14px")
            .text("Sessions");

        container
            .append("g")
            .call(yAxis)
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -55)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .style("font-size", "14px")
            .text("Conversion Rate (%)");

        // Create tooltip
        const tooltip = d3
            .select("body")
            .append("div")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("border-radius", "4px")
            .style("padding", "10px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("z-index", 1000);

        // Add circles for each campaign
        container
            .selectAll("circle")
            .data(scatterData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.sessions))
            .attr("cy", d => yScale(d.cvr))
            .attr("r", d => sizeScale(d.sessions))
            .attr("fill", d => colorScale(d.channel))
            .attr("opacity", 0.7)
            .attr("stroke", "white")
            .attr("stroke-width", 1)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                // Highlight the point
                d3.select(event.currentTarget)
                    .attr("opacity", 1)
                    .attr("stroke-width", 2);

                // Show tooltip
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <div>
                            <strong>${d.channel.toUpperCase()}</strong><br/>
                            Campaign: ${d.campaign}<br/>
                            ${d.influencer ? `Influencer: ${d.influencer}<br/>` : ''}
                            CVR: ${d.cvr.toFixed(2)}%<br/>
                            Sessions: ${d.sessions}<br/>
                            State: ${d.state || 'Unknown'}<br/>
                            Medium: ${d.medium}<br/>
                            Paid: ${d.isPaid ? 'Yes' : 'No'}
                        </div>
                    `);
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", (event) => {
                d3.select(event.currentTarget)
                    .attr("opacity", 0.7)
                    .attr("stroke-width", 1);
                
                tooltip.style("opacity", 0);
            });

        // Add legend
        const legend = container
            .append("g")
            .attr("transform", `translate(${innerWidth + 20}, 20)`);

        const legendItems = legend
            .selectAll(".legend-item")
            .data(channels)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        legendItems
            .append("circle")
            .attr("r", 6)
            .attr("fill", d => colorScale(d))
            .attr("opacity", 0.7);

        legendItems
            .append("text")
            .attr("x", 12)
            .attr("y", 0)
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .attr("fill", "black")
            .text(d => d)
            .each(function(d) {
                const textElement = d3.select(this);
                const textLength = textElement.node().getComputedTextLength();
                const maxWidth = 100; // Maximum width for labels
                
                if (textLength > maxWidth) {
                    // Truncate text and add ellipsis
                    let text = d;
                    while (textElement.node().getComputedTextLength() > maxWidth +1 && text.length > 3) {
                        text = text.slice(0, -1);
                        textElement.text(text + "...");
                    }
                }
            });

        // Add title
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .attr("fill", "black")
            .text("Marketing Campaign Performance: CVR vs Sessions");

        // Cleanup function
        return () => {
            tooltip.remove();
        };

    }, [data, width, height]);

    return <svg ref={svgRef} width={width} height={height} />;
}

export default MarketingScatter;
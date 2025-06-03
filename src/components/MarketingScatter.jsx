import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Best Sellers CVR Analysis Scatter Plot
 * Shows campaigns that are lowering CVR for best-sellers collection
 * 
 * @param {Object} data - Marketing data from marketingResources function
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 */
function BestSellersCVRScatter({ data, width = 1200, height = 600 }) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || !data.campaigns) {
            console.warn("No campaign data available for visualization.");
            return;
        }

        // Filter for best-sellers campaigns only
        const bestSellersData = data.campaigns.filter(campaign => {
            return campaign.totalSessions >= 5; // Minimum sessions for meaningful analysis
        });

        if (bestSellersData.length === 0) {
            console.warn("No best-sellers campaign data found.");
            return;
        }

        // Setup dimensions
        const margin = { top: 60, right: 200, bottom: 80, left: 100 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Clear previous content
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const container = svg
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Define scales
        const xScale = d3
            .scaleLinear()
            .domain([0, d3.max(bestSellersData, d => d.totalSessions) * 1.1])
            .range([0, innerWidth])
            .nice();

        const yScale = d3
            .scaleLinear()
            .domain([0, Math.max(d3.max(bestSellersData, d => d.conversionRate), 5)])
            .range([innerHeight, 0])
            .nice();

        // Color scale by platform
        const platforms = [...new Set(bestSellersData.map(d => d.platform))];
        const colorScale = d3
            .scaleOrdinal()
            .domain(platforms)
            .range([
                "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", 
                "#1abc9c", "#34495e", "#e67e22", "#95a5a6", "#c0392b"
            ]);

        // Size scale based on total visitors
        const sizeScale = d3
            .scaleSqrt()
            .domain([0, d3.max(bestSellersData, d => d.totalVisitors)])
            .range([6, 20]);

        // Create axes
        const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
        const yAxis = d3.axisLeft(yScale).tickFormat(d => d + "%");

        // Add grid lines
        container
            .append("g")
            .attr("class", "grid")
            .selectAll("line")
            .data(xScale.ticks())
            .enter()
            .append("line")
            .attr("x1", d => xScale(d))
            .attr("x2", d => xScale(d))
            .attr("y1", 0)
            .attr("y2", innerHeight)
            .attr("stroke", "#f0f0f0")
            .attr("stroke-width", 1);

        container
            .append("g")
            .attr("class", "grid")
            .selectAll("line")
            .data(yScale.ticks())
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", d => yScale(d))
            .attr("y2", d => yScale(d))
            .attr("stroke", "#f0f0f0")
            .attr("stroke-width", 1);

        // Add CVR benchmark line at 2%
        container
            .append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", yScale(2))
            .attr("y2", yScale(2))
            .attr("stroke", "#e74c3c")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0.8);

        container
            .append("text")
            .attr("x", innerWidth - 10)
            .attr("y", yScale(2) - 5)
            .attr("text-anchor", "end")
            .attr("fill", "#e74c3c")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text("2% CVR Benchmark");

        // Add axes
        container
            .append("g")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(xAxis);

        container
            .append("g")
            .call(yAxis);

        // Add axis labels
        container
            .append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 50)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Total Sessions");

        container
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -60)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Conversion Rate (%)");

        // Create tooltip
        const tooltip = d3
            .select("body")
            .append("div")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.9)")
            .style("color", "white")
            .style("border-radius", "8px")
            .style("padding", "12px")
            .style("font-size", "13px")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("z-index", 1000)
            .style("box-shadow", "0 4px 6px rgba(0, 0, 0, 0.1)");

        // Add circles for each campaign
        const circles = container
            .selectAll("circle")
            .data(bestSellersData)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.totalSessions))
            .attr("cy", d => yScale(d.conversionRate))
            .attr("r", d => sizeScale(d.totalVisitors))
            .attr("fill", d => colorScale(d.platform))
            .attr("opacity", d => d.isLowPerforming ? 0.9 : 0.6)
            .attr("stroke", d => d.isLowPerforming ? "#fff" : "none")
            .attr("stroke-width", d => d.isLowPerforming ? 2 : 0)
            .style("cursor", "pointer");

        // Add hover effects
        circles
            .on("mouseover", (event, d) => {
                // Highlight the point
                d3.select(event.currentTarget)
                    .attr("opacity", 1)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 3);

                // Show tooltip
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <div style="line-height: 1.4;">
                            <div style="font-weight: bold; color: ${colorScale(d.platform)}; margin-bottom: 6px;">
                                ${d.platform.toUpperCase()}
                            </div>
                            <div><strong>Campaign:</strong> ${d.campaign}</div>
                            ${d.influencer ? `<div><strong>Influencer:</strong> ${d.influencer}</div>` : ''}
                            <div><strong>CVR:</strong> ${d.conversionRate.toFixed(2)}%</div>
                            <div><strong>Sessions:</strong> ${d.totalSessions.toLocaleString()}</div>
                            <div><strong>Visitors:</strong> ${d.totalVisitors.toLocaleString()}</div>
                            <div><strong>Conversions:</strong> ${d.totalConversions}</div>
                            <div><strong>Performance:</strong> ${d.performanceLevel}</div>
                            ${d.isLowPerforming ? '<div style="color: #e74c3c; font-weight: bold;">⚠️ Low Performing</div>' : ''}
                        </div>
                    `);
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", (event, d) => {
                d3.select(event.currentTarget)
                    .attr("opacity", d.isLowPerforming ? 0.9 : 0.6)
                    .attr("stroke", d.isLowPerforming ? "#fff" : "none")
                    .attr("stroke-width", d.isLowPerforming ? 2 : 0);
                
                tooltip.style("opacity", 0);
            });

        // Add legend
        const legend = container
            .append("g")
            .attr("transform", `translate(${innerWidth + 20}, 20)`);

        // Platform legend
        const platformLegend = legend
            .append("g")
            .attr("class", "platform-legend");

        platformLegend
            .append("text")
            .attr("x", 0)
            .attr("y", 0)
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .attr("fill", "black")
            .text("Platform");

        const platformItems = platformLegend
            .selectAll(".platform-item")
            .data(platforms)
            .enter()
            .append("g")
            .attr("class", "platform-item")
            .attr("transform", (d, i) => `translate(0, ${(i + 1) * 22})`);

        platformItems
            .append("circle")
            .attr("r", 8)
            .attr("fill", d => colorScale(d))
            .attr("opacity", 0.8);

        platformItems
            .append("text")
            .attr("x", 15)
            .attr("y", 0)
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .attr("fill", "black")
            .text(d => d);

        // Performance legend
        const performanceLegend = legend
            .append("g")
            .attr("class", "performance-legend")
            .attr("transform", `translate(0, ${(platforms.length + 2) * 22})`);

        performanceLegend
            .append("text")
            .attr("x", 0)
            .attr("y", 0)
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .attr("fill", "black")
            .text("Performance");

        const perfItems = [
            { label: "Low Performing (<2%)", hasStroke: true },
            { label: "Good Performing (≥2%)", hasStroke: false }
        ];

        const performanceItems = performanceLegend
            .selectAll(".perf-item")
            .data(perfItems)
            .enter()
            .append("g")
            .attr("class", "perf-item")
            .attr("transform", (d, i) => `translate(0, ${(i + 1) * 20})`);

        performanceItems
            .append("circle")
            .attr("r", 6)
            .attr("fill", "#666")
            .attr("opacity", (d, i) => i === 0 ? 0.9 : 0.6)
            .attr("stroke", d => d.hasStroke ? "#fff" : "none")
            .attr("stroke-width", d => d.hasStroke ? 2 : 0);

        performanceItems
            .append("text")
            .attr("x", 15)
            .attr("y", 0)
            .attr("dy", "0.35em")
            .style("font-size", "11px")
            .attr("fill", "black")
            .text(d => d.label);

        // Add title and summary
        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", 25)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .attr("fill", "black")
            .text("Best-Sellers Collection: Campaign CVR Analysis");

        svg
            .append("text")
            .attr("x", width / 2)
            .attr("y", 45)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .attr("fill", "#666")
            .text(`${data.summary.lowPerformingCampaigns} of ${data.summary.totalCampaigns} campaigns below 2% CVR | Overall CVR: ${data.summary.overallCVR}%`);

        // Cleanup function
        return () => {
            tooltip.remove();
        };

    }, [data, width, height]);

    // Show loading state if no data
    if (!data || !data.campaigns) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <div className="text-center">
                    <div className="text-gray-500 text-lg">Loading campaign data...</div>
                    <div className="text-gray-400 text-sm mt-2">Please ensure your data is properly formatted</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <svg ref={svgRef} width={width} height={height} className="border border-gray-200 rounded-lg bg-white" />
            
            {/* Summary cards below the chart */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-red-800 text-sm font-medium">Low Performing</div>
                    <div className="text-red-900 text-2xl font-bold">{data.summary.lowPerformingCampaigns}</div>
                    <div className="text-red-600 text-xs">campaigns below 2% CVR</div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-blue-800 text-sm font-medium">Total Sessions</div>
                    <div className="text-blue-900 text-2xl font-bold">{data.summary.totalSessions.toLocaleString()}</div>
                    <div className="text-blue-600 text-xs">best-sellers traffic</div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-green-800 text-sm font-medium">Overall CVR</div>
                    <div className="text-green-900 text-2xl font-bold">{data.summary.overallCVR}%</div>
                    <div className="text-green-600 text-xs">best-sellers average</div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-purple-800 text-sm font-medium">Total Campaigns</div>
                    <div className="text-purple-900 text-2xl font-bold">{data.summary.totalCampaigns}</div>
                    <div className="text-purple-600 text-xs">analyzed campaigns</div>
                </div>
            </div>
        </div>
    );
}

export default BestSellersCVRScatter;
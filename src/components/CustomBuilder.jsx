import { useEffect } from "react";
import * as d3 from "d3";

function groupOrdersByBundleType(arrObj) {
    return d3.group(arrObj, d => {
      // Find the _title property for this order
      const titleProp = d.lineitemProperties.find(prop => prop.name === '_title');
      return titleProp ? titleProp.value : 'No Bundle Type';
    });
}

function CustomBuilder({ data, containerId }) {
    useEffect(() => {
        if (!data || data.length === 0) return;

        drawChart(data);
    }, [data]);

    function drawChart(data) {
        d3.select(`#${containerId}`).selectAll("*").remove();

        console.log(data);

        const margin = { top: 100, right: 50, bottom: 80, left: 80 },
            width = 1000 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        const svg = d3
            .select(`#${containerId}`)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Group orders by bundle type
        const groupedOrders = groupOrdersByBundleType(data);
        
        // Get only "Bikini Mystery Pack" orders
        const bikiniOrders = groupedOrders.get("") || [];
        
        if (bikiniOrders.length === 0) {
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("Null Pack orders found");
            return;
        }

        // Parse dates and group by day
        bikiniOrders.forEach(d => {
            d.parsedDate = new Date(d.createdAt);
            d.dateString = d3.timeFormat("%Y-%m-%d")(d.parsedDate);
        });

        // Group by date and count units (numberOfItems) per day
        const dailyData = d3.rollup(
            bikiniOrders,
            v => d3.sum(v, d => d.numberOfItems), // Sum numberOfItems for each day
            d => d.dateString
        );

        // Convert to array format for D3
        const chartData = Array.from(dailyData, ([date, units]) => ({
            date: new Date(date),
            units: units
        })).sort((a, b) => a.date - b.date);

        console.log("Daily Bikini Mystery Pack sales:", chartData);

        // Set up scales
        const xScale = d3.scaleBand()
            .domain(chartData.map(d => d3.timeFormat("%m/%d")(d.date)))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.units)])
            .nice()
            .range([height, 0]);

        // Create bars
        svg.selectAll(".bar")
            .data(chartData)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d3.timeFormat("%m/%d")(d.date)))
            .attr("width", xScale.bandwidth())
            .attr("y", d => yScale(d.units))
            .attr("height", d => height - yScale(d.units))
            .attr("fill", "#000")
            .attr("stroke", "#FFF")
            .attr("stroke-width", 1);

        // Add value labels on bars
        svg.selectAll(".bar-label")
            .data(chartData)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", d => xScale(d3.timeFormat("%m/%d")(d.date)) + xScale.bandwidth() / 2)
            .attr("y", d => yScale(d.units) - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text(d => d.units);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(yScale));

        // Add X axis label
        svg.append("text")
            .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Date");

        // Add Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .text("Units Sold");

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Emtpy  - Daily Units Sold");

        // Add summary info
        const totalUnits = d3.sum(chartData, d => d.units);
        const totalDays = chartData.length;
        const avgUnitsPerDay = Math.round(totalUnits / totalDays);

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 20)
            .attr("text-anchor", "end")
            .style("font-size", "12px")
            .text(`Total: ${totalUnits} units over ${totalDays} days (avg: ${avgUnitsPerDay}/day)`);
    }

    return <div id={containerId} />;
}

export default CustomBuilder;
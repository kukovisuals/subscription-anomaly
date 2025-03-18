import { useEffect, useRef } from "react";
import * as d3 from "d3";

/**
 * Example ScatterPlot component
 *
 * @param {Array} data - The array of analyzed orders returned by `productSales`.
 * @param {number} width - The width of the SVG.
 * @param {number} height - The height of the SVG.
 */
function CheaterScatterPlot({ data, width, height }) {
    const svgRef = useRef(null);

    useEffect(() => {
        // console.log(data);
        if (!data || !data.length) {
            console.warn("No data available for the scatter plot.");
            return;
        }

        // 1) Transform data for the scatter plot:
        //    - totalAmount = sum of all `item.total` in the order
        //    - productCount = sum of all `item.quantity`
        const scatterData = data.map((order, i) => {
            const totalAmount = d3.sum(order.items, (d) => d.total);
            const productCount = d3.sum(order.items, (d) => d.quantity);
            return {
                index: i,                       // numeric index for x-scale
                orderNumber: order.orderNumber, // might be useful for tooltips
                totalAmount,
                productCount,
                items: order.items,
            };
        });

        // console.log("nsd", scatterData)

        // const allTypesSubscriptions = scatterData[scatterData.length - 1].items[0].allSubsType

        // console.log('all types ', allTypesSubscriptions)

        // 2) Setup canvas (margins, widths, etc.)
        const margin = { top: 20, right: 20, bottom: 50, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Select or create the SVG
        const svg = d3.select(svgRef.current);
        // Clear out old contents
        svg.selectAll("*").remove();

        // Create a container <g> inside the SVG for our plot
        const container = svg
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // 3) Define scales
        // X-Scale: treat the order index as a continuous or band scale
        // Option A: scaleLinear based on indices
        const xScale = d3
            .scaleLinear()
            .domain([0, scatterData.length - 1]) // from 0 up to max index
            .range([0, innerWidth]);

        // Y-Scale: based on total amount spent
        const yMax = d3.max(scatterData, (d) => d.totalAmount) || 0;
        const yScale = d3
            .scaleLinear()
            .domain([0, yMax])
            .range([innerHeight, 0])
            .nice();

        // Circle radius scale: from productCount
        // For example, min radius = 5, max radius = 20
        const rScale = d3
            .scaleLinear()
            .domain([0, d3.max(scatterData, (d) => d.productCount) || 1])
            .range([0.1, 10]);

        // 4) Axes
        const xAxis = d3.axisBottom(xScale).ticks(scatterData.length);
        const yAxis = d3.axisLeft(yScale).ticks(6);


        // Add x-axis
        container
            .append("g")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(xAxis)
            .append("text")
            .attr("class", "axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", 40)
            .attr("text-anchor", "middle")
            .text("Order Index");

        // Add y-axis
        container
            .append("g")
            .call(yAxis)
            .append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -45)
            .attr("text-anchor", "middle")
            .text("Total Amount Spent");

        // 5) Create a tooltip div (absolutely positioned)
        //    We'll move and show/hide this on mouseover events.
        const tooltip = d3
            .select("body")  // or you could append to svgRef.current.parentNode
            .append("div")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid #ccc")
            .style("border-radius", "4px")
            .style("padding", "6px")
            .style("pointer-events", "none")
            .style("opacity", 0);

        // 6) Plot the points and add tooltip interactivity
        container
            .selectAll("circle")
            .data(scatterData)
            .enter()
            .append("circle")
            .attr("cx", (d) => xScale(d.index))
            .attr("cy", (d) => yScale(d.totalAmount))
            .attr("r", (d) => rScale(d.productCount))
            .attr("fill", "#36C8F7")
            .attr("opacity", 0.7)
            .on("mouseover", (event, d) => {
                // Build a string listing all items + quantity
                const itemsList = d.items
                    .map((item) => `${item.name} x${item.quantity}`)
                    .join(", ");

                tooltip
                    .style("opacity", 1)
                    .style("color", "black")
                    .html(`
            <div>
              <strong>Order: ${d.orderNumber}</strong><br/>
              Total: $${d.totalAmount.toFixed(2)}<br/>
              Items: ${itemsList}
            </div>
          `);
            })
            .on("mousemove", (event, d) => {
                // Position tooltip near the mouse cursor
                tooltip
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY - 28 + "px");
            })
            .on("mouseout", () => {
                // Hide tooltip
                tooltip.style("opacity", 0);
            });

        // 6) Optional: add tooltips, labels, or transitions as needed
        // ...
        // 7) Cleanup function for removing the tooltip if the component unmounts
        return () => {
            tooltip.remove();
        };
    }, [data, width, height]);

    return <svg ref={svgRef} width={width} height={height} />;
}

export default CheaterScatterPlot;

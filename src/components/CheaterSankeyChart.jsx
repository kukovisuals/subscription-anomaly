import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";

function CheaterSankeyChart({ data, width, height }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("No valid data for visualization.");
      return;
    }

    console.log("Sankey Data:", data);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define Nodes and Links for Sankey
    const nodes = [
      { name: "Orders" },
      { name: "Expected Freebies" },
      { name: "Received Freebies" },
      { name: "Legit Orders ✅" },
      { name: "Cheaters 🚨" }
    ];

    const links = [];

    data.forEach((order) => {
      const { orderNumber, freePanties, freeBras, expectedFreePanties, expectedFreeBras } = order;
      const expectedTotal = expectedFreePanties + expectedFreeBras;
      const receivedTotal = freePanties + freeBras;
      const isCheater = receivedTotal > expectedTotal;

      // Orders → Expected
      links.push({ source: 0, target: 1, value: expectedTotal });

      // Expected → Received
      links.push({ source: 1, target: 2, value: receivedTotal });

      // Received → Cheater or Legit
      links.push({
        source: 2,
        target: isCheater ? 4 : 3,
        value: receivedTotal,
      });
    });

    // Create Sankey layout
    const sankeyGen = sankey()
      .nodeWidth(20)
      .nodePadding(30)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 1]]);

    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGen({
      nodes: nodes.map(d => Object.assign({}, d)), 
      links: links.map(d => Object.assign({}, d))
    });

    // Draw Links
    svg.append("g")
      .selectAll("path")
      .data(sankeyLinks)
      .enter()
      .append("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", d => d.target.index === 4 ? "red" : "green")
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("fill", "none")
      .attr("opacity", 0.7);

    // Draw Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(sankeyNodes)
      .enter()
      .append("g");

    node.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", sankeyGen.nodeWidth())
      .attr("fill", d => (d.index === 4 ? "red" : "blue"))
      .attr("stroke", "#000");

    node.append("text")
      .attr("x", d => d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("font-size", "20px")
      .attr("fill", "#fff")
      .text(d => d.name);
  }, [data, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}

export default CheaterSankeyChart;

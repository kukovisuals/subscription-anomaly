import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";

function CheaterSankeyDiagram({ data, width, height, isSet }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("No valid data for the Sankey diagram.");
      return;
    }

    // 1) MARGINS & DIMENSIONS
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear old contents
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove();

    // Inner group
    const container = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // 2) GET ALL SUBSCRIPTION TYPES (LEFT)
    //    If your subscription types come from data[0].allSubsType, use that:
    let allSubsType = [];
    if(isSet){
        allSubsType = data[0].allSubsType.filter(d => d.includes("Set")) || [];
    } else {
        allSubsType = data[0].allSubsType.filter(d => !d.includes("Set")) || [];
    }
    const subscriptionSet = new Set(allSubsType); // for easy lookups
    console.log(subscriptionSet)

    // 3) GATHER ALL DISTINCT **NON-SUBSCRIPTION** PRODUCTS (RIGHT)
    //    Exclude anything that contains these keywords in its name:
    const SKIP_KEYWORDS = [
      "subscription",
      "quarterly",
      "semi annual",
      "semi-annual",
      "auto renew",
    ];

    const productNamesSet = new Set();
    data.forEach((order) => {
      order.items.forEach((item) => {
        const { name } = item;
        if (!name) return; // guard against undefined name

        const lowerName = name.trim().toLowerCase();

        // Decide if we skip this name because it contains any unwanted keyword
        const shouldSkip = SKIP_KEYWORDS.some((kw) => lowerName.includes(kw));
        if (!shouldSkip) {
          productNamesSet.add(name);
        }
      });
    });

    // Optional debugging: log every item that we do / don't skip
    // (Uncomment these lines if you want to see the filter in action in console.)
    
    // console.log("=== FILTERING PRODUCTS ===");
    // data.forEach((order) => {
    //   order.items.forEach((item) => {
    //     const { name } = item;
    //     if (!name) return;
    //     const lowerName = name.trim().toLowerCase();
    //     const shouldSkip = SKIP_KEYWORDS.some((kw) => lowerName.includes(kw));
    //     console.log(
    //       shouldSkip
    //         ? `SKIPPING:  ${name}`
    //         : `INCLUDING: ${name}`
    //     );
    //   });
    // });
    

    const productNames = Array.from(productNamesSet);

    // 4) CREATE NODES
    //    Left nodes = subscription types
    const sankeyNodesLeft = allSubsType.map((st) => ({ name: st }));
    //    Right nodes = filtered product names
    const sankeyNodesRight = productNames.map((pn) => ({ name: pn }));
    // Combine
    const allNodes = [...sankeyNodesLeft, ...sankeyNodesRight];

    // Build index maps
    const subsTypeToIndex = new Map();
    allSubsType.forEach((st, i) => subsTypeToIndex.set(st, i));

    const productNameToIndex = new Map();
    productNames.forEach((pn, i) => {
      // Right-side nodes come after the left-side ones
      productNameToIndex.set(pn, allSubsType.length + i);
    });

    // 5) BUILD LINKS
    const sankeyLinks = [];
    data.forEach((order) => {
      order.items.forEach((item) => {
        const { subsType, name, quantity = 1 } = item;
        if (!subsType || !name) return;

        // Link only if subType is recognized AND the name was included on right
        if (subsTypeToIndex.has(subsType) && productNameToIndex.has(name)) {
            console.log("whats the name", name)
          sankeyLinks.push({
            source: subsTypeToIndex.get(subsType),
            target: productNameToIndex.get(name),
            value: quantity,
          });
        }
      });
    });

    // 6) PREPARE SANKEY LAYOUT
    const sankeyGen = sankey()
      .nodeWidth(20)
      .nodePadding(20)
      .extent([[0, 0], [innerWidth, innerHeight]]);

    const graph = {
      nodes: allNodes.map((d) => Object.assign({}, d)),
      links: sankeyLinks.map((d) => Object.assign({}, d)),
    };

    const { nodes: sankeyNodes, links: sankeyLinksFinal } = sankeyGen(graph);

    // 7) DRAW LINKS
    const color = d3.scaleOrdinal([
      ...d3.schemeCategory10,
      ...d3.schemeAccent,
      ...d3.schemeDark2,
      ...d3.schemePastel1,
      ...d3.schemePastel2,
      ...d3.schemeSet1,
      ...d3.schemeSet2,
      ...d3.schemeSet3,
      ...d3.schemeTableau10,
      ...d3.schemeCategory10,
    ]).domain(sankeyNodes.map(d => d.name));

    container.append("g")
      .selectAll("path")
      .data(sankeyLinksFinal)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", (d) => color(d.source.name))
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .attr("opacity", 0.8);

    // 8) DRAW NODES
    const node = container.append("g")
      .selectAll("g")
      .data(sankeyNodes)
      .join("g");

    node
      .append("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) => color(d.name))
      .attr("stroke", "#000");

    node
      .append("text")
      .attr("x", (d) => d.x0 - 6)
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .style("font-size", "12px")
      .text((d) => d.name)
      // If node is on left half, label on the right side
      .filter((d) => d.x0 < innerWidth / 2)
      .attr("x", (d) => d.x1 + 6)
      .attr("text-anchor", "start");
  }, [data, width, height]);

  return <svg ref={svgRef} />;
}

export default CheaterSankeyDiagram;

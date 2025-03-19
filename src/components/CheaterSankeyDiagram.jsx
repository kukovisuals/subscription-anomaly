import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal, sankeyCenter, sankeyLeft } from "d3-sankey";

function CheaterSankeyDiagram({ data, width, height, isSet }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn("No valid data for the Sankey diagram.");
      return;
    }

    console.log("data", data)
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


    // 2) Define Skip Keywords and Sub Rules
    const SKIP_KEYWORDS = [
      "subscription",
      "quarterly",
      "semi annual",
      "semi-annual",
      "auto renew",
    ];

    const SANKY_SUB_RULES = {
      "Custom Relief Bra Set Subscription Box": (name) =>
        name.includes("Relief Bra") &&
        !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw)),

      "Custom Wireless Bra Set Subscription Box": (name) =>
        name.includes("Bralette") &&
        !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw)),

      "Custom Support Bra Set Subscription Box": (name) =>
        name.includes("Bralette") &&
        !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw)),

      "Custom Sheer Bra Set Subscription Box": (name) =>
        name.includes("Mesh") &&
        name.includes("Bralette") &&
        !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw)),
    };

    // 3) Identify All Subscriptions, Bras, Panties, and Extras
    //    (We assume at least one order has "allSubsType" to read from.)
    const allSubsType = (data[0].allSubsType || []).filter((d) => d.includes(`${isSet} Set`));
    const sankeyNodesLeft = allSubsType.map((st) => ({ name: st }));

    const isBra = (name) =>
      name && (name.includes("Bra") || name.includes("Balconette"));
    const isPanty = (name) =>
      name &&
      (name.includes("Panty") ||
        name.includes("Brief") ||
        name.includes("Thong") ||
        name.includes("High") ||
        name.includes("Bikini") ||
        name.includes("Cheeky"));

    const braNamesSet = new Set();
    const pantyNamesSet = new Set();
    const otherNamesSet = new Set();

    // Gather all bra/panty/other names across ALL orders
    data.forEach((order) => {
      const braArr = [];
      const pantyArr = [];

      order.items.forEach((item) => {
        const { name } = item;
        if (!name) return;
        const lowerName = name.trim().toLowerCase();

        const shouldSkip = SKIP_KEYWORDS.some((kw) => lowerName.includes(kw));
        if (!shouldSkip) {
          if (isBra(name)) {
            braArr.push(name.trim());
          }
          if (isPanty(name)) {
            pantyArr.push(name.trim());
          }
        }
      });

      if(braArr.length < 1 || pantyArr.length < 1){
        console.warn("Look at this order something went wrong ", order );
      } else { 
        // The leftover “extra” items for that order
        braArr.slice(1).forEach((b) => otherNamesSet.add(b));
        braNamesSet.add(braArr.shift().trim());
        pantyArr.slice(1).forEach((p) => otherNamesSet.add(p));
        pantyNamesSet.add(pantyArr.shift().trim());
      }
    });
    

    const braNames = Array.from(braNamesSet);
    const pantyNames = Array.from(pantyNamesSet);
    const otherNames = Array.from(otherNamesSet);

    const sankeyNodesRight = braNames.map((pn) => ({ name: pn }));
    const sankeyNodesPanty = pantyNames.map((pn) => ({ name: pn }));
    const sankeyNodesOther = otherNames.map((pn) => ({ name: pn }));

    // 4) Combine All Nodes
    const allNodes = [
      ...sankeyNodesLeft,
      ...sankeyNodesRight,
      ...sankeyNodesPanty,
      ...sankeyNodesOther,
    ];
    console.log("allNodes", allNodes)
    // 5) Build Index Maps
    const subsTypeToIndex = new Map();
    allSubsType.forEach((st, i) => subsTypeToIndex.set(st, i));

    const braIndexOffset = sankeyNodesLeft.length;
    const braNameToIndex = new Map();
    braNames.forEach((pn, i) => braNameToIndex.set(pn, braIndexOffset + i));

    const pantyIndexOffset = braIndexOffset + sankeyNodesRight.length;
    const pantyNameToIndex = new Map();
    pantyNames.forEach((p, i) => pantyNameToIndex.set(p, pantyIndexOffset + i));

    const additionalItemsNodeIndex = pantyIndexOffset + sankeyNodesPanty.length;
    const additionalItemToIndex = new Map();
    otherNames.forEach((item, i) =>
      additionalItemToIndex.set(item, additionalItemsNodeIndex + i)
    );

    // 6) Build the Sankey Links in a DOUBLE LOOP
    //    Outer loop: each order
    //    Inner loop: each item in the order
    const sankeyLinks = [];


    data.forEach((order) => {
      order.items.forEach((item) => {
        const { subsType, name, quantity = 1 } = item;
        if (!subsType || !name) return; // Skip if not a subscription item

        // A) Find Subscription Type Index
        const subIndex = subsTypeToIndex.get(subsType);
        if (subIndex === undefined) {
          // Not one of our "Set" sub types
          return;
        }

        // B) Find the first bra that matches this sub’s rule
        const braMatchFn = SANKY_SUB_RULES[subsType];
        const firstMatchingBra = order.items.find(
          (i) =>
            braMatchFn &&
            braMatchFn(i.name) &&
            isBra(i.name) &&
            !SKIP_KEYWORDS.some((kw) => i.name.toLowerCase().includes(kw))
        );
        const braIndex = firstMatchingBra
          ? braNameToIndex.get(firstMatchingBra.name)
          : undefined;

        // If we have subIndex & braIndex, link sub → bra
        if (braIndex !== undefined) {
          sankeyLinks.push({
            source: subIndex,
            target: braIndex,
            value: quantity,
          });
        }

        // C) Find first panty
        const firstMatchingPanty = order.items.find(
          (i) =>
            isPanty(i.name) &&
            !SKIP_KEYWORDS.some((kw) => i.name.toLowerCase().includes(kw))
        );
        const pantyIndex = firstMatchingPanty
          ? pantyNameToIndex.get(firstMatchingPanty.name)
          : undefined;

        // If bra & panty exist, link bra → panty
        if (braIndex !== undefined && pantyIndex !== undefined) {
          
          sankeyLinks.push({
            source: braIndex,
            target: pantyIndex,
            value: firstMatchingPanty.quantity || 1,
          });
        }

        // D) Leftover items: exclude the first bra, first panty, sub items, skip words
        if (pantyIndex !== undefined) {
          const leftoverItems = order.items.filter((prod) => {
            if (!prod.name) return false;
            const lower = prod.name.toLowerCase();
            if (prod.name === firstMatchingBra?.name) return false;
            if (prod.name === firstMatchingPanty?.name) return false;
            if (lower.includes("subscription")) return false;
            if (SKIP_KEYWORDS.some((kw) => lower.includes(kw))) return false;
            return true;
          });

          leftoverItems.forEach((extraItem, index) => {

            const leftoverBraIdx = braNameToIndex.get(extraItem.name);
            const leftoverPantyIdx = pantyNameToIndex.get(extraItem.name);
            const leftoverOtherIdx = additionalItemToIndex.get(extraItem.name);

            const finalTargetIndex = leftoverPantyIdx ?? leftoverOtherIdx ?? leftoverBraIdx;
            
            if (finalTargetIndex !== undefined) {
              sankeyLinks.push({
                source: pantyIndex,
                target: finalTargetIndex,
                value: extraItem.quantity || 1,
              });
            } else {
              console.warn(`⚠ WARNING: No valid index found for extra item: ${extraItem.name}`);
            }
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
      .style("font-size", "17px")
      .text((d) => d.name)
      // If node is on left half, label on the right side
      .filter((d) => d.x0 < innerWidth / 2)
      .attr("x", (d) => d.x1 + 6)
      .attr("text-anchor", "start");
  }, [data, width, height, isSet]);

  return <svg ref={svgRef} />;
}

export default CheaterSankeyDiagram;

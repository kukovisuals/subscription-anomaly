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

    const SKIP_KEYWORDS = [
      "subscription",
      "quarterly",
      "semi annual",
      "semi-annual",
      "auto renew",
    ];

    const SANKY_SUB_RULES = {
      "Custom Relief Bra Set Subscription Box": (name) => {
        name.includes("Relief Bra") && !SKIP_KEYWORDS.some((kw) => {
          console.log(name.toLowerCase().includes(kw))
        })
        return name.includes("Relief Bra") && !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw))
      },

      "Custom Wireless Bra Set Subscription Box": (name) => {
        name.includes("Bralette") && !SKIP_KEYWORDS.some((kw) => {
          console.log(name.toLowerCase().includes(kw))
        })
        return name.includes("Bralette") && !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw))
      },

      "Custom Support Bra Set Subscription Box": (name) => {
        name.includes("Bralette") && !SKIP_KEYWORDS.some((kw) => {
          console.log(name.toLowerCase().includes(kw))
        })
        return name.includes("Bralette") && !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw))
      },

      "Custom Sheer Bra Set Subscription Box": (name) => {
        name.includes("Mesh") && !SKIP_KEYWORDS.some((kw) => {
          console.log(name.toLowerCase().includes(kw))
        })
        return (name.includes("Mesh") && name.includes("Bralette")) && !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw))
      }

    };



    // 1) Filter all subscriptions that contain "Set"
    const allSubsType = data[0].allSubsType.filter(d => d.includes("Set"));
    const sankeyNodesLeft = allSubsType.map((st) => ({ name: st }));

    // 2) Identify all bras and panties
    const isBra = (name) => name && (name.includes("Bra") || name.includes("Bralette"));
    const isPanty = (name) => name && (name.includes("Panty") || name.includes("Brief") || name.includes("Thong"));

    const braNamesSet = new Set();
    const pantyNamesSet = new Set();

    // Populate bras and panties
    data.forEach((order) => {
      order.items.forEach((item) => {
        const { name } = item;
        const lowerName = name.trim().toLowerCase();

        // Decide if we skip this name because it contains any unwanted keyword
        const shouldSkip = SKIP_KEYWORDS.some((kw) => lowerName.includes(kw));
        if (!shouldSkip) {
          if (isBra(name)) braNamesSet.add(name.trim());
          if (isPanty(name)) pantyNamesSet.add(name.trim());
        }
      });
    });

    const braNames = Array.from(braNamesSet);
    const pantyNames = Array.from(pantyNamesSet);

    const sankeyNodesRight = braNames.map((pn) => ({ name: pn }));
    const sankeyNodesPanty = pantyNames.map((pn) => ({ name: pn }));

    // Combine nodes
    const allNodes = [...sankeyNodesLeft, ...sankeyNodesRight, ...sankeyNodesPanty];

    // Build index maps
    const subsTypeToIndex = new Map();
    allSubsType.forEach((st, i) => subsTypeToIndex.set(st, i));

    const braIndexOffset = sankeyNodesLeft.length;
    const braNameToIndex = new Map();
    braNames.forEach((pn, i) => braNameToIndex.set(pn, braIndexOffset + i));

    const pantyIndexOffset = braIndexOffset + sankeyNodesRight.length;
    const pantyNameToIndex = new Map();
    pantyNames.forEach((p, i) => pantyNameToIndex.set(p, pantyIndexOffset + i));

    console.log("Panty Index Map:", pantyNameToIndex);



    // 3) Build links following the correct order
    // const sankeyLinks = [];
    // data.forEach((order) => {
    //   order.items.forEach((item) => {
    //     const { subsType, name, quantity = 1 } = item;
    //     if (!subsType || !name) return;

    //     // Step 1: Get the correct bra that belongs to the subscription
    //     const braMatchFn = SANKY_SUB_RULES[subsType];
    //     const matchingBra = order.items.find(
    //       (i) => braMatchFn && braMatchFn(i.name) && isBra(i.name) && !SKIP_KEYWORDS.some((kw) => i.name.toLowerCase().includes(kw))
    //     );

    //     // Step 2: Find the first panty item
    //     const firstPanty = order.items.find(i => isPanty(i.name));

    //     if (subsType === "Custom Sheer Bra Set Subscription Box") {
    //       console.log(`Sheer Bra Set Match:`, { subsType, matchingBra });
    //     }

    //     if (!matchingBra || !firstPanty) return; // Skip if any step is missing

    //     const subIndex = subsTypeToIndex.get(subsType);
    //     const braIndex = braNameToIndex.get(matchingBra.name);
    //     const pantyIndex = pantyNameToIndex.get(firstPanty.name);

    //     if (subIndex !== undefined && braIndex !== undefined) {
    //       console.log(`Link: ${subsType} → ${matchingBra.name}`);
    //       sankeyLinks.push({ source: subIndex, target: braIndex, value: quantity });
    //     }

    //     if (braIndex !== undefined && pantyIndex !== undefined) {
    //       console.log(`Link: ${matchingBra.name} → ${firstPanty.name}`);
    //       sankeyLinks.push({ source: braIndex, target: pantyIndex, value: quantity });
    //     }
    //   });
    // });
    const sankeyLinks = [];
    data.forEach((order) => {
      order.items.forEach((item) => {
        const { subsType, name, quantity = 1 } = item;
        if (!subsType || !name) return;

        // Step 1: Get the first matching "Relief Bra"
        const braMatchFn = SANKY_SUB_RULES[subsType];
        const firstMatchingBra = order.items.find(
          (i) => braMatchFn && braMatchFn(i.name) && isBra(i.name) && !SKIP_KEYWORDS.some((kw) => i.name.includes(kw))
        );

        // Step 2: Collect all additional products (bras, panties, briefs, etc.)
        const additionalProducts = order.items.filter(
          (i) => i.name !== firstMatchingBra?.name // Exclude the first matching bra
        );

        // Step 3: Get the indexes for the first matching bra
        const subIndex = subsTypeToIndex.get(subsType);
        const braIndex = firstMatchingBra ? braNameToIndex.get(firstMatchingBra.name) : undefined;

        // Step 4: Create the first main link
        if (subIndex !== undefined && braIndex !== undefined) {
          console.log(`Primary Link: ${subsType} → ${firstMatchingBra.name}`);
          sankeyLinks.push({ source: subIndex, target: braIndex, value: quantity });
        }

        // Step 5: Connect all additional products to the first relief bra
        additionalProducts.forEach((prod) => {
          const prodIndex = pantyNameToIndex.get(prod.name) || braNameToIndex.get(prod.name);
          if (braIndex !== undefined && prodIndex !== undefined) {
            console.log(`Additional Link: ${firstMatchingBra.name} → ${prod.name}`);
            sankeyLinks.push({ source: braIndex, target: prodIndex, value: prod.quantity });
          }
        });
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
  }, [data, width, height, isSet]);

  return <svg ref={svgRef} />;
}

export default CheaterSankeyDiagram;

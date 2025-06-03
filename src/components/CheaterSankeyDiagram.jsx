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
      .attr("stroke", (d) => getNodeColor(d.source.name))
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .attr("opacity", 0.5);

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
      .attr("fill", (d) => getNodeColor(d.name))
      .attr("stroke", "#000");

    node
      .append("text")
      .attr("x", (d) => d.x0 - 6)
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .style("font-size", "20px")
      .text((d) => d.name)
      // If node is on left half, label on the right side
      .filter((d) => d.x0 < innerWidth / 2)
      .attr("x", (d) => d.x1 + 6)
      .attr("text-anchor", "start");


  }, [data, width, height, isSet]);

  return <svg ref={svgRef} />;
}

const partialColorMap = [
  { keyword: "subscription", color: "#474c5f" },
  { keyword: "rose", color: "#E6B6B1" },
  { keyword: "teal", color: "#2B5977" },
  { keyword: "charisma", color: "#6B1547" },
  { keyword: "dusty rose", color: "#9D625D" },
  { keyword: "bourbon", color: "#6F3A21" },
  { keyword: "mint", color: "#70BB9B" },
  { keyword: "skyway", color: "#A4C4E9" },
  { keyword: "pink lady", color: "#EAB5D8" },
  { keyword: "red plum", color: "#A1353F" },
  { keyword: "gold dust", color: "#cc9329" },
  { keyword: "strawberry", color: "#eb9191" }, // sc-strawberry_ice
  { keyword: "cadet", color: "#907f9f" },
  { keyword: "blue opal", color: "#0a3e6e" },
  { keyword: "laurel green", color: "#cbd5bb" },
  { keyword: "rose clay", color: "#d4aca7" },
  { keyword: "woodsmoke", color: "#937764" },
  { keyword: "fallen rock", color: "#9c877a" },
  { keyword: "black", color: "#171717" },
  { keyword: "white", color: "#ffffff" },
  { keyword: "nude", color: "#d1b5a7" },
  { keyword: "green millieu", color: "#7B938B" },
  { keyword: "sunkissed", color: "#ba8164" },
  { keyword: "grey", color: "#bebebe" },
  { keyword: "provincial blue", color: "#6d99be" },
  { keyword: "poppy red", color: "#d01b10" },
  { keyword: "castor grey", color: "#52525b" },
  { keyword: "blue iris", color: "#717dd7" },
  { keyword: "fuchsia", color: "#c32e67" },
  { keyword: "rose dust", color: "#DCBEB9" },
  { keyword: "lime punch", color: "#d5da3a" },
  { keyword: "beveled glass", color: "#99d6cd" },
  { keyword: "fjord blue", color: "#0e90ce" },
  { keyword: "keepsake lilac", color: "#d7c0c7" },
  { keyword: "puritan grey", color: "#ced0d6" },
  { keyword: "castle wall", color: "#d5c3b6" },
  { keyword: "coral pink", color: "#f2aea0" },
  { keyword: "raindrop", color: "#cbc7d6" },
  { keyword: "caribbean sea", color: "#00a7d7" },
  { keyword: "ocean depths", color: "#018db5" },
  { keyword: "hyper pink", color: "#ff467f" },
  { keyword: "cactus", color: "#52713e" },
  { keyword: "brush", color: "#e2c3b1" },
  { keyword: "port", color: "#603637" },
  { keyword: "espresso", color: "#452f24" },
  { keyword: "roseata fleur", color: "#cd9caa" },
  { keyword: "brick dust", color: "#A9685E" },
  { keyword: "peach bloom", color: "#D99B7C" },
  { keyword: "jacaranda", color: "#A69EBF" },
  { keyword: "tango", color: "#F0918E" },
  { keyword: "celestial", color: "#BBC7CE" },
  { keyword: "claret", color: "#B1382D" },
  { keyword: "rich mocha", color: "#593229" },
  { keyword: "zen", color: "#C0C8ED" },
  { keyword: "oyster", color: "#B1A6AF" },
  { keyword: "pearl", color: "#E0DCD9" },
  { keyword: "begonia", color: "#DBA2CB" },
  { keyword: "olive", color: "#8C8727" },
  { keyword: "champagne", color: "#A28777" },
  { keyword: "peacock", color: "#04A8B1" },
  { keyword: "pistachio", color: "#C9E6E1" },
  { keyword: "sachet", color: "#E8BDD7" },
  { keyword: "ethereal", color: "#CAE1EA" },
  { keyword: "haze", color: "#C4BBBE" },
  { keyword: "flamingo", color: "#E28B89" },
  { keyword: "guava", color: "#F5C19E" },
  { keyword: "lilac", color: "#AE9FC4" },
  { keyword: "deep ocean", color: "#192443" },
  { keyword: "eden", color: "#5F5749" },
  { keyword: "ash rose", color: "#DFA8A0" },
  { keyword: "butternut", color: "#906C36" },
  { keyword: "potion", color: "#97234C" },
  { keyword: "winter sky", color: "#D5E8F6" },
  { keyword: "tangerine", color: "#EE5347" },
  { keyword: "lavender fog", color: "#D7CBD4" },
  { keyword: "grape wine", color: "#47305E" },

  // ---- Mapped Product Names ----
  { keyword: "strawberry patch", color: "#eb9191" },
  { keyword: "nude", color: "#d1b5a7" },
  { keyword: "dreamscape", color: "#A4C4E9" },
  { keyword: "black", color: "#171717" },
  { keyword: "lavender fog", color: "#D7CBD4" },
  { keyword: "grape wine", color: "#47305E" },
  { keyword: "deep ocean", color: "#192443" },
  { keyword: "tuscan", color: "#906C36" },
  { keyword: "champagne", color: "#A28777" },
  { keyword: "cosmic", color: "#018db5" },
  { keyword: "granada sky", color: "#018db5" },
  { keyword: "sunkissed", color: "#ba8164" },
];


function getNodeColor(productName) {
  const lowerName = productName.toLowerCase();

  // 1) Try partial matches
  for (const entry of partialColorMap) {
    if (lowerName.includes(entry.keyword)) {
      return entry.color; 
    }
  }

  // 2) Default fallback if nothing matched
  return "#ccc";
}


export default CheaterSankeyDiagram;

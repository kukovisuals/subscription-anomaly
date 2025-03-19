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
        // name.includes("Relief Bra") && !SKIP_KEYWORDS.some((kw) => {
          // console.log(name.toLowerCase().includes(kw))
        // })
        return name.includes("Relief Bra") && !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw))
      },

      "Custom Wireless Bra Set Subscription Box": (name) => {
        // name.includes("Bralette") && !SKIP_KEYWORDS.some((kw) => {
        // console.log(name.toLowerCase().includes(kw))
        // })
        return name.includes("Bralette") && !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw))
      },

      "Custom Support Bra Set Subscription Box": (name) => {
        // name.includes("Bralette") && !SKIP_KEYWORDS.some((kw) => {
        // console.log(name.toLowerCase().includes(kw))
        // })
        return name.includes("Bralette") && !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw))
      },

      "Custom Sheer Bra Set Subscription Box": (name) => {
        // name.includes("Mesh") && !SKIP_KEYWORDS.some((kw) => {
        // console.log(name.toLowerCase().includes(kw))
        // })
        return (name.includes("Mesh") && name.includes("Bralette")) && !SKIP_KEYWORDS.some((kw) => name.toLowerCase().includes(kw))
      }

    };



    // 1) Filter all subscriptions that contain "Set"
    const allSubsType = data[0].allSubsType.filter(d => d.includes("Set"));
    const sankeyNodesLeft = allSubsType.map((st) => ({ name: st }));

    // 2) Identify all bras and panties
    const isBra = (name) => name && (name.includes("Bra") || name.includes("Bralette"));
    const isPanty = (name) => name && (name.includes("Panty") || name.includes("Brief") || name.includes("Thong") || name.includes("High") || name.includes("Cheeky"));

    const braNamesSet = new Set();
    const pantyNamesSet = new Set();
    const otherNamesSet = new Set();

    // Populate bras and panties
    data.forEach((order) => {
      let braArr = []
      let pantyArr = []

      order.items.forEach((item) => {
        const { name } = item;
        const lowerName = name.trim().toLowerCase();

        // Decide if we skip this name because it contains any unwanted keyword
        const shouldSkip = SKIP_KEYWORDS.some((kw) => lowerName.includes(kw));
        if (!shouldSkip) {
          if (isBra(name)) {
            braNamesSet.add(name.trim());
            braArr.push(name.trim());
          }
          if (isPanty(name)) {
            pantyNamesSet.add(name.trim());
            pantyArr.push(name.trim());
          }
        }
      });
      // Keep only the additional items (excluding first bra and first panty)
      braArr.slice(1).forEach((b) => otherNamesSet.add(b)); // Remaining bras
      pantyArr.slice(1).forEach((p) => otherNamesSet.add(p)); // Remaining panties

    });

    const braNames = Array.from(braNamesSet);
    const pantyNames = Array.from(pantyNamesSet);
    const otherNames = Array.from(otherNamesSet);

    const sankeyNodesRight = braNames.map((pn) => ({ name: pn }));
    const sankeyNodesPanty = pantyNames.map((pn) => ({ name: pn }));
    const sankeyNodesOther = otherNames.map((pn) => ({ name: pn }));

    // Combine nodes
    const allNodes = [...sankeyNodesLeft, ...sankeyNodesRight, ...sankeyNodesPanty, ...sankeyNodesOther];

    // Build index maps
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
    otherNames.forEach((item, i) => additionalItemToIndex.set(item, additionalItemsNodeIndex + 1 + i));


    console.log("------------------------------------------------------------")
    console.log("All Sankey Nodes:", allNodes.map((n, i) => ({ index: i, name: n.name })));
    console.log("Missing Index:", additionalItemToIndex);
    console.log("------------------------------------------------------------")


    const sankeyLinks = [];

    data.forEach((order) => {
      // We assume there's at least one subscription type with "Set"
      // If there are multiple, pick whichever you want or loop them
      const subscriptionType = order.allSubsType.find((t) => t.includes("Set"));
      if (!subscriptionType) {
        return; // skip if no subscription
      }

      const subIndex = subsTypeToIndex.get(subscriptionType);
      if (subIndex === undefined) {
        return;
      }

      // 1) Find the "first bra" that matches the subscription’s bra rule
      const braMatchFn = SANKY_SUB_RULES[subscriptionType];
      const firstMatchingBra = order.items.find(
        (i) =>
          braMatchFn &&
          braMatchFn(i.name) &&
          isBra(i.name) &&
          !SKIP_KEYWORDS.some((kw) => i.name.toLowerCase().includes(kw))
      );

      // 2) Find the "first panty"
      const firstMatchingPanty = order.items.find(
        (i) =>
          isPanty(i.name) &&
          !SKIP_KEYWORDS.some((kw) => i.name.toLowerCase().includes(kw))
      );

      // If we found a bra, link Subscription → that bra
      let braNodeIndex;
      if (firstMatchingBra) {
        braNodeIndex = braNameToIndex.get(firstMatchingBra.name);
        if (braNodeIndex !== undefined) {
          sankeyLinks.push({
            source: subIndex,
            target: braNodeIndex,
            value: firstMatchingBra.quantity || 1,
          });
        }
      }

      // If we found both bra + panty, link Bra → Panty
      let pantyNodeIndex;
      if (firstMatchingBra && firstMatchingPanty && braNodeIndex !== undefined) {
        pantyNodeIndex = pantyNameToIndex.get(firstMatchingPanty.name);
        if (pantyNodeIndex !== undefined) {
          sankeyLinks.push({
            source: braNodeIndex,
            target: pantyNodeIndex,
            value: firstMatchingPanty.quantity || 1,
          });
        }
      }

      // 3) “Other” leftover items (beyond that first bra & panty).
      //    Link Panty → each leftover item
      if (pantyNodeIndex !== undefined) {
        // Exclude the subscription item, the first bra, and the first panty
        const leftoverItems = order.items.filter((prod) => {
          const wasFirstBra = prod.name === firstMatchingBra?.name;
          const wasFirstPanty = prod.name === firstMatchingPanty?.name;
          const isSubscription = prod.name.toLowerCase().includes("subscription");
          const isKeywordSkipped = SKIP_KEYWORDS.some((kw) => prod.name.toLowerCase().includes(kw));
          // const isAlreadyCountedAsBra = braNameToIndex.has(prod.name);

          // if (wasFirstBra) console.log("Skipping as first bra:", prod.name);
          // if (wasFirstPanty) console.log("Skipping as first panty:", prod.name);
          // if (isSubscription) console.log("Skipping as subscription:", prod.name);
          // if (isKeywordSkipped) console.log("Skipping due to keyword:", prod.name);
          // if (isAlreadyCountedAsBra) console.log("Skipping because it's already a bra:", prod.name);

          if (wasFirstBra || wasFirstPanty || isSubscription || isKeywordSkipped) {
            return false;
          }
          return true;
        });


        // leftoverItems.forEach((extraItem) => {
        //   console.log("Processing Extra Item:", extraItem.name);

        //   // Check if it's already a known bra
        //   const leftoverBraIdx = braNameToIndex.get(extraItem.name);
        //   if (leftoverBraIdx !== undefined) {
        //     console.log(`✔ Found in braNameToIndex: ${extraItem.name} → Index ${leftoverBraIdx}`);
        //   }

        //   // Check if it's already a known panty
        //   const leftoverPantyIdx = pantyNameToIndex.get(extraItem.name);
        //   if (leftoverPantyIdx !== undefined) {
        //     console.log(`✔ Found in pantyNameToIndex: ${extraItem.name} → Index ${leftoverPantyIdx}`);
        //   }

        //   // Check if it's an "other" product
        //   const leftoverOtherIdx = additionalItemToIndex.get(extraItem.name);
        //   if (leftoverOtherIdx !== undefined) {
        //     console.log(`✔ Found in additionalItemToIndex: ${extraItem.name} → Index ${leftoverOtherIdx}`);
        //   }

        //   // Assigning the final target index
        //   const finalTargetIndex = leftoverPantyIdx ?? leftoverOtherIdx ?? leftoverBraIdx;


        //   console.log(`🔍 Final Target Index for ${extraItem.name}:`, finalTargetIndex);

        //   if (finalTargetIndex !== undefined) {
        //     console.log(`✅ Adding link: ${firstMatchingPanty.name} (${pantyNodeIndex}) → ${extraItem.name} (${finalTargetIndex})`);
        //     sankeyLinks.push({
        //       source: pantyNodeIndex,
        //       target: finalTargetIndex,
        //       value: extraItem.quantity || 1,
        //     });
        //   } else {
        //     console.warn(`⚠ WARNING: No valid index found for extra item: ${extraItem.name}`);
        //   }

        // });

      }
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

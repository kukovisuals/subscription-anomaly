import { useEffect } from "react";
import * as d3 from "d3";

// If you still use these helpers:
import createCheckboxes from "../utilities/checkBoxes";    // Adjust import path
import parseName from "../utilities/productName";

function StackedBars({data}) {
  useEffect(() => {
    // Kick off your D3 logic once component mounts
    loadDataTwo(data);
  }, [data]);

  async function loadDataTwo(allFileOrders) {
    // This replicates your logic for fetching/aggregating data

    // console.log(allFileOrders)
    const groupedData = d3.rollup(
      allFileOrders,
      v => d3.sum(v, d => d.quantity),
      d => d.date,
      d => d.name,
      d => d.variant
    );

    // Convert the Map into a structured array
    const groupedArray = [];
    for (const [date, nameMap] of groupedData) {
      for (const [name, variantMap] of nameMap) {
        const variantsArr = Array.from(variantMap, ([variant, totalQuantity]) => ({
          variant,
          totalQuantity
        }));
        groupedArray.push({
          date,
          name,
          variants: variantsArr
        });
      }
    }

    // Filter
    const filteredProducts = groupedArray.filter(product =>
      /Balconette|Bra|Bralette/i.test(product.name)
    );

    // parseName => product + color
    function preprocessData(data) {
      return data.map(d => {
        const { product, color } = parseName(d.name);
        return {
          ...d,
          product,
          color,
        };
      });
    }

    const originalData = preprocessData(filteredProducts);

    // Build checkbox UI data
    window.allProducts = Array.from(new Set(originalData.map(d => d.product)));
    window.allColors = Array.from(new Set(originalData.map(d => d.color)));

    // Build the checkboxes and pass in "updateChart" as callback
    createCheckboxes("#product-filters", window.allProducts, updateChart);
    createCheckboxes("#color-filters", window.allColors, updateChart);

    // Build date filter
    d3.select("#daysSelector").on("change", updateChart);

    // Initial draw
    drawMultipleStackedBars(originalData);

    // Callback to filter & redraw
    function updateChart() {
      // 1) Which products?
      const selectedProducts = [];
      d3.selectAll("#product-filters input[type=checkbox]")
        .each(function () {
          if (d3.select(this).property("checked")) {
            selectedProducts.push(d3.select(this).attr("value"));
          }
        });

      // 2) Which colors?
      const selectedColors = [];
      d3.selectAll("#color-filters input[type=checkbox]")
        .each(function () {
          if (d3.select(this).property("checked")) {
            selectedColors.push(d3.select(this).attr("value"));
          }
        });

      // 3) If none selected => interpret as all selected
      const productsFilter = selectedProducts.length
        ? selectedProducts
        : window.allProducts;
      const colorsFilter = selectedColors.length
        ? selectedColors
        : window.allColors;

      // 4) Days
      const selectedDays = +d3.select("#daysSelector").node().value;
      const maxDate = d3.max(originalData, d => d.date);
      if (!maxDate) {
        drawMultipleStackedBars([]);
        return;
      }
      let cutoff = null;
      if (selectedDays !== 9999) {
        cutoff = new Date(maxDate.getTime() - (selectedDays * 24 * 60 * 60 * 1000));
      }

      // 5) Filter
      const filteredData = originalData.filter(d => {
        const productMatch = productsFilter.includes(d.product);
        const colorMatch = colorsFilter.includes(d.color);
        const dateMatch = cutoff ? (d.date >= cutoff) : true;
        return productMatch && colorMatch && dateMatch;
      });

      drawMultipleStackedBars(filteredData);
    }
  }

  function drawMultipleStackedBars(data) {
    // Your original logic, slightly adapted
    const newData = data
    .map(product => ({
      ...product,
      totalQuantity: product.variants.reduce((sum, v) => sum + v.totalQuantity, 0) // Sum all variant quantities
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity) // Sort descending by totalQuantity
    .map(({ totalQuantity, ...rest }) => rest); // Remove totalQuantity from final output

  // 1) Identify all product names by grouping
  const productsMap = d3.group(newData, d => d.name);

  // 2) Set up chart dimensions and container
  const width = 300;
  const height = 400;
  const margin = { top: 30, right: 20, bottom: 50, left: 40 };

  const container = d3.select("#products_two").html(""); // clear or use .select() as needed

  // 3) For each product, build a stacked-bar chart
  for (const [productName, entries] of productsMap) {
    // A) Gather & sort all unique dates present in this product’s entries
    const dateKeys = Array.from(
      new Set(entries.map(d => +d.date)) // +d.date => numeric timestamp for sorting
    ).sort((a, b) => a - b);



    const allVariants = ["xs", "sm", "md", "lg", "xl", "sdd", "mdd", "ldd", "xldd", "2xldd"];

    // C) Pivot the data so each object has structure:
    //    { variant: "xs", [date1]: qty, [date2]: qty, ... }
    const pivotedData = allVariants.map(variant => {
      const row = { variant };
      // Initialize all date columns to 0
      for (const dateVal of dateKeys) {
        row[dateVal] = 0;
      }
      // Fill in actual quantities from each entry
      for (const entry of entries) {
        const varData = entry.variants.find(v => v.variant === variant);
        if (varData) {
          row[+entry.date] = varData.totalQuantity;
        }
      }
      return row;
    });

    // console.log("dates final",)

    const stack = d3.stack()
      .keys(dateKeys); // your "layers" are the different dates
    // Generate the stacked layers
    const series = stack(pivotedData);
    // E) Compute max stacked value to define y-scale
    const maxStackedValue = d3.max(series, layer =>
      d3.max(layer, d => d[1])
    );

    // F) Create scales
    // 1) y-axis now uses band scale for variants
    const y = d3.scaleBand()
      .domain(allVariants)  // each variant on y-axis
      .range([margin.top, height - margin.bottom])
      .padding(0.1);

    // 2) x-axis now uses linear scale for quantity
    const x = d3.scaleLinear()
      .domain([0, maxStackedValue])
      .range([margin.left, width - margin.right]);

    // A color scale for the "layers" (i.e. each date)
    const color = d3.scaleOrdinal()
      .domain(dateKeys.map(String))
      .range(["#A1A5A6", "#000000"]);

    const colorB = d3.scaleOrdinal()
      .domain(dateKeys.map(String))
      .range(["#A1A5A6", "#0593A2"]);

    // G) Create an <svg> for this product
    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height);

    // 1) Create a tooltip
    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "#fff")
      .style("border", "1px solid #999")
      .style("border-radius", "4px")
      .style("padding", "5px 8px")
      .style("font-size", "12px")
      .style("opacity", 0); // start hidden

    // H) Draw stacked bars
    const bar = svg.selectAll("g.layer")
      .data(series)
      .enter()
      .append("g")
      .attr("class", "layer")
      .attr("fill", (d, i) => {
         // The product name for this segment
          console.log(productName)
          // Check if the name matches one of your "special" names
          if (productName === "Dreamscape Relief Bra" || productName === "Black Mesh Bralette" || productName === "Pearl Relief Bra" || productName === "Nude Relief Bra" || productName === "Nude Bralette" || productName === "Black Relief Bra"  || productName === "Black Bralette"){
            return colorB(String(dateKeys[i]));
          } else {
            // Otherwise, use your original color scale
            return color(String(dateKeys[i]));
          }
      }
    );

    bar.selectAll("rect")
      .data(d => d)
      .enter()
      .append("rect")
      .attr("y", d => y(d.data.variant))
      .attr("height", y.bandwidth())
      .attr("x", d => x(d[0]))
      .attr("width", 0) // start collapsed for animation
      // 4) Add tooltip events
      .on("mouseover", function (event, dRect) {
        tooltip.style("opacity", 1);
        // Quantity is (y1 - y0)
        const quantity = dRect[1] - dRect[0];
        // The layer index is the parent <g>’s datum index:
        const layerIndex = d3.select(this.parentNode).datum().index;
        // Convert dateVal (timestamp) to a nice string
        const dateVal = dateKeys[layerIndex];
        const dateStr = d3.timeFormat("%Y-%m-%d")(new Date(dateVal));

        tooltip.html(`
    <strong>Date:</strong> ${dateStr}<br/>
    <strong>Variant:</strong> ${dRect.data.variant}<br/>
    <strong>Qty:</strong> ${quantity}
  `);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY + 12) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });



    // Step 1: Animate the reveal, then add sold-out marker
    bar.each(function (layerData, i) {
      d3.select(this).selectAll("rect")
        .transition()
        .delay(i * 1000)
        .duration(800)
        .attr("x", d => x(d[0]))
        .attr("width", d => x(d[1]) - x(d[0]))
        .on("end", function (dRect) {
          const quantity = dRect[1] - dRect[0];
          if (quantity === 0) {
            // Coordinates for our label
            const labelX = x(dRect[1]) + 5;
            const labelY = y(dRect.data.variant) + y.bandwidth() / 2;
            const labelWidth = 50;
            const labelHeight = 20;

            // Draw a red rectangle as the background
            d3.select(this.parentNode)
              .append("rect")
              .attr("x", labelX)
              .attr("y", labelY - labelHeight / 2)
              .attr("width", labelWidth)
              .attr("height", labelHeight)
              .attr("fill", "#F46660")
              .attr("rx", 3)  // rounded corners (optional)
              .attr("ry", 3);

            // Draw white text on top of the rectangle
            d3.select(this.parentNode)
              .append("text")
              .attr("x", labelX + labelWidth / 2)
              .attr("y", labelY)
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .attr("fill", "white")
              .attr("font-size", "12px")
              .attr("font-weight", "bold")
              .text("No Sale");
          }

          if (quantity > 3) {
            // Coordinates for our label
            const labelX = x(dRect[0]) + (x(dRect[1]) - x(dRect[0])) / 2;
            const labelY = y(dRect.data.variant) + y.bandwidth() / 2;

            // Append text on top of the rect
            d3.select(this.parentNode)
              .append("text")
              .attr("class", "quantity-label")
              .attr("x", labelX)
              .attr("y", labelY)
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .attr("fill", "#FFF")  // Ensure contrast
              .attr("font-size", "12px")
              .attr("font-weight", "bold")
              .text(quantity);
          }
        });
    });

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y));

    // K) Add product name as a title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(productName);
    }
  }

  return (
    <div style={{ margin: "2rem" }}>
      <h1>Product Sale</h1>
      <div className="mainWrapper">
        <div className="container-filter">
          <p>Type of products</p>
          <div id="product-filters"></div>
        </div>
        <div className="container-filter">
          <p>Colors</p>
          <div id="color-filters"></div>
        </div>
      </div>

      <p>Dates</p>
      <div style={{ marginBottom: "2rem" }}>
        <label htmlFor="daysSelector">Show data for the last:</label>
        <select id="daysSelector" defaultValue="9999">
          <option value="1">1 day</option>
          <option value="3">3 days</option>
          <option value="6">6 days</option>
          <option value="30">30 days</option>
          <option value="9999">All</option>
        </select>
      </div>
      <div id="products_two"></div>
    </div>
  );
}

export default StackedBars;

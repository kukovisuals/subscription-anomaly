import * as d3 from "d3";
import _ from "lodash";

/**
 * Processes CSV files and returns a structured array of suspicious ("cheater") orders.
 *
 * @param {Array} files - Array of file objects with { file, date }
 * @returns {Promise<Array>} An array of suspicious orders with structured data for visualization.
 */
export async function productSales(files) {
  let allFileOrders = [];

  // Load and clean CSV data
  for (const { file, date } of files) {
    const data = await d3.csv(file, (d) => {
      if (d["Lineitem name"]?.includes("Extender")) return null;
      if (d["Name"]?.includes("EXC")) return null;

      // Extract product details
      const parts = d["Lineitem name"]?.split(" - ") || [];
      const name = parts[0]?.trim() || "Unknown";

      return {
        date: new Date(date),
        name,
        quantity: +d["Lineitem quantity"] || 0,
        itemPrice: +d["Lineitem price"] || 0, // Individual item price
        total: +d["Total"] || 0, // Line item total
        discountCode: d["Discount Code"] || null,
        orderNumber: d["Name"],
      };
    });

    allFileOrders.push(...data.filter(Boolean));
  }

  // Group orders by order number
  const groupedOrders = _.groupBy(allFileOrders, "orderNumber");

  // Detect inconsistencies and suspicious orders
  const analyzedOrders = [];
  for (const [orderNumber, items] of Object.entries(groupedOrders)) {
    let hasPantySubscription = items.some((item) =>
      item.name.toLowerCase().includes("panty subscription")
    );
    let hasSetSubscription = items.some((item) =>
      item.name.toLowerCase().includes("set subscription")
    );
    let hasFreeBraCode = items.some(
      (item) => item.discountCode && item.discountCode.toLowerCase() === "freebra"
    );

    const len = items.length;

    // if(+items[0].total > 300){
    //   continue
    // }

    if( (hasSetSubscription || hasPantySubscription || hasFreeBraCode) && len < 2){
      analyzedOrders.push({
        orderNumber,
        hasPantySubscription,
        hasSetSubscription,
        hasFreeBraCode,
        items,
        size: len
      });
    }
  }

  // console.log("Analyzed Orders", analyzedOrders);
  // console.log("Analyzed Orders", JSON.stringify(analyzedOrders));
  return analyzedOrders;
}

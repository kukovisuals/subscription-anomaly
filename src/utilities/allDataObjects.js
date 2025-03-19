import * as d3 from "d3";
import _ from "lodash";

/**
 * Processes CSV files and returns a structured array of suspicious ("cheater") orders.
 *
 * @param {Array} files - Array of file objects with { file, date }
 * @returns {Promise<Array>} An array of suspicious orders with structured data for visualization.
 */
export async function subscriptionSales(files) {
  let allFileOrders = [];

  // Load and clean CSV data
  let allSubsType = [];
  let lastSubs = null
  for (const { file, date } of files) {

    const data = await d3.csv(file, (d) => {
      if (d["Lineitem name"]?.includes("Extender")) return null;
      if (d["Name"]?.includes("EXC")) return null;

      // Extract product details
      const parts = d["Lineitem name"]?.split(" - ") || [];
      let name = parts[0]?.trim() || "Unknown";
      let subsType = null 
      let variantSize = parts[1]?.trim() || "Unknown";

      
      if(d["Lineitem name"].includes("Subscription") && d["Lineitem name"].includes(" / ")){
        name = d["Lineitem name"]
        subsType = parts[0]?.trim() || "Unknown";
        variantSize = parts[1]?.trim() || "Unknown";
        lastSubs = parts[0]?.trim() || "Unknown";
      } else if (parts.length === 3){
        // console.log("parts == 3", d["Lineitem name"])
        name = d["Lineitem name"]
        subsType = parts[1]?.trim() || "Unknown";
        variantSize = parts[2]?.trim() || "Unknown";
        lastSubs = parts[0]?.trim() || "Unknown";
      } else {
        // subsType = lastSubs
      }
      // console.log(d)
      // if(subsType == "EBY Subscription"){
      //   debugger
      // }

      if(subsType !== null && allSubsType.indexOf(subsType) < 0){
        allSubsType.push(subsType);
      }

      return {
        date: new Date(date),
        name,
        subsType,
        variantSize,
        quantity: +d["Lineitem quantity"] || 0,
        itemPrice: +d["Lineitem price"] || 0, // Individual item price
        total: +d["Total"] || 0, // Line item total
        discountCode: d["Discount Code"] || null,
        orderNumber: d["Name"],
        allSubsType
      };
    });
    // console.log("All subs type", allSubsType);
    allFileOrders.push(...data.filter(Boolean));
  }

  // Group orders by order number
  const groupedOrders = _.groupBy(allFileOrders, "orderNumber");

  // Detect inconsistencies and suspicious orders
  const analyzedOrders = [];
  for (const [orderNumber, items] of Object.entries(groupedOrders)) {
    let hasPantySubscription = items.some((item) =>
      item.name.toLowerCase().includes("quarterly")
    );
    let hasSetSubscription = items.some((item) =>
      item.name.toLowerCase().includes("set")
    );
    let othersSubs = items.some((item) =>
      item.name.toLowerCase().includes("semi annual") || item.name.toLowerCase().includes("renew")
    );
    let hasFreeBraCode = items.some(
      (item) => item.discountCode && item.discountCode.toLowerCase() === "freebra"
    );

    const len = items.length;

    
    
    if( (hasSetSubscription ) ){ // || hasFreeBraCode)){ && len < 2){
      // console.log("data before filtering Subscription", items)
      // if(hasSetSubscription){
      //   debugger
      // }
      
      const newCheck = items.filter(d => d.name.includes("Subscription"))


      for(const subItem of items){
        const subsTypeOriginal = newCheck[0].subsType
        subItem.subsType = subsTypeOriginal
        // if(subItem.name.includes("Custom Relief Bra Set Subscription Box - md / md")){
        //   debugger
        // }
      }

      // console.log("After", items)
      analyzedOrders.push({
        orderNumber,
        hasPantySubscription,
        hasSetSubscription,
        hasFreeBraCode,
        items,
        size: len,
        allSubsType: items[0].allSubsType
      });
    }
  }

  // console.log("Analyzed Orders", analyzedOrders);
  // console.log("Analyzed Orders", JSON.stringify(analyzedOrders));
  return analyzedOrders;
}

export async function landingPages(files) {
  let allData = [];

  for (const { file, date } of files) {
    const data = await d3.csv(file, (d) => {
      return {
        year: date,
        name: d["Landing page path"] || "UNKNOWN",
        n: +d["Sessions"] || 0,
        cartAdditions: +d["Sessions with cart additions"] || 0,
        cvr: +d["Conversion rate"] * 100 || 0, // Ensure it's a number
      };
    });
    allData.push(...data);
  }
  // Group by date
  return allData
  
}

export async function productSales(files) {

  let allFileOrders = [];

  for (const { file, date } of files) {
    const data = await d3.csv(file, d => {
      if (d["Lineitem name"]?.includes("Extender")) return null;
      if (d["Lineitem name"]?.includes("Subscription")) return null;
      if (d["Name"]?.includes("EXC")) return null;

      let variant;
      let name;
      if (d["Lineitem name"]) {
        let parts = d["Lineitem name"].split(" - ");
        name = parts[0] || "Unknown";
        variant = parts[1]?.toLowerCase();
        
        if(d["Lineitem sku"][0] == "W"){
          name = `Wireless ${parts[0] || "Unknown"}`   
        }
      }
      

      return {
        // Convert the passed-in 'date' to a Date object
        date: new Date(date),
        name,
        variant,
        quantity: +d["Lineitem quantity"] || 0,
      };
    });
    // Flatten everything into one array
    allFileOrders.push(...data);
  }

  return allFileOrders
}
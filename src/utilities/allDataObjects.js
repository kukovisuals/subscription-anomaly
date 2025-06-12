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


      if (d["Lineitem name"].includes("Subscription") && d["Lineitem name"].includes(" / ")) {
        name = d["Lineitem name"]
        subsType = parts[0]?.trim() || "Unknown";
        variantSize = parts[1]?.trim() || "Unknown";
        lastSubs = parts[0]?.trim() || "Unknown";
      } else if (parts.length === 3) {
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

      if (subsType !== null && allSubsType.indexOf(subsType) < 0) {
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
  // Define priority order

  for (const [orderNumber, items] of Object.entries(groupedOrders)) {
    let hasPantySubscription = items.some((item) =>
      item.name.toLowerCase().includes("custom sheer bra set subscription")
    );
    let hasSetSubscription = items.some((item) =>
      item.name.toLowerCase().includes("relief bra set subscription")
    );
    let othersSubs = items.some((item) =>
      item.name.toLowerCase().includes("custom support bra set subscription box")
    );
    let hasFreeBraCode = items.some((item) =>
      item.name.toLowerCase().includes("custom wireless bra set subscription")
    );

    const len = items.length;




    if ((othersSubs || hasPantySubscription || hasSetSubscription || hasFreeBraCode) ) { // || hasFreeBraCode)){ && len < 2){
    // if ((hasSetSubscription) ) { // || hasFreeBraCode)){ && len < 2){
      // console.log("data before filtering Subscription", items)
      if(hasFreeBraCode){
        // debugger
      }
      const newCheck = items.filter(d => d.name.includes("Subscription"))

      for (const subItem of items) {
        const subsTypeOriginal = newCheck[0].subsType
        subItem.subsType = subsTypeOriginal
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

        if (d["Lineitem sku"][0] == "W") {
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

import nlp from 'compromise';


export async function reviewsCleanup(files) {

  let allFileOrders = [];


  for (const { file } of files) {
    const data = await d3.csv(file, d => {

      if (d["body"].length < 1) return null

      const newBody = cleanTokens(d["body"].toLocaleLowerCase())

      return {
        title: d["title"].toLocaleLowerCase() || "",
        body: newBody || "",
        product: d["product"].toLocaleLowerCase() || "",
        sentiment_score: +d["sentiment_score"] || 0,
      };
    });
    // Flatten everything into one array
    allFileOrders.push(...data);
  }

  const onlySubs = allFileOrders
    // .filter(d => d.product.includes("subscription"))
    .sort((a, b) => a.product.localeCompare(b.product));

  const grouped = d3.groups(onlySubs, d => d.product);

  // Convert grouped data into one object per product with average sentiment
  const averaged = grouped.map(([product, reviews]) => {
    const avgScore = d3.mean(reviews, r => r.sentiment_score);
    return {
      product,
      sentiment_score: avgScore,
      count: reviews.length
    };
  });

  // Sort by product name or sentiment
  averaged.sort((a, b) => a.product.localeCompare(b.product));
  averaged.sort((a, b) => b.sentiment_score - a.sentiment_score);


  return averaged
}

export async function reviewsTokens(files) {

  let allFileOrders = [];


  for (const { file } of files) {
    const data = await d3.csv(file, d => {

      if (d["body"].length < 1) return null

      const newBody = cleanTokens(d["body"].toLocaleLowerCase())

      return {
        title: d["title"].toLocaleLowerCase() || "",
        body: newBody || "",
        product: d["product"].toLocaleLowerCase() || "",
        sentiment_score: +d["sentiment_score"] || 0,
        created_at: d["created_at"] || ""
      };
    });
    // Flatten everything into one array
    allFileOrders.push(...data);
  }

  const onlySubs = allFileOrders
    // .filter(d => !d.product.includes("subscription"))
    .sort((a, b) => a.product.localeCompare(b.product));

  // onlySubs.map( d => console.log(d.body))
  // console.log(onlySubs)
  return onlySubs
}

function cleanTokens(text) {
  const stopwords = [
    "i", "my", "it", "if", "a", "me", "have", "was", "me", "what", "so", "the", "and", "is", "with", "for", "to", "me", "as", "of", "are", "on", "that", "am", "just", "can't",
    "they", "this", "these", "wait", "box", "subscription", "first", "next" // <- optional custom removals
  ];

  const doc = nlp(text).normalize({ punctuation: true, lowercase: true });
  const words = doc.terms().out('array');

  // Then apply your stopwords filtering
  const cleanTokens = words
    .map(w => w.replace(/[^\w\s]/g, ''))        // Remove punctuation from each word
    .filter(w => w.length > 1 && !stopwords.includes(w));

  return cleanTokens
}


/*
  * Marketing data
*/

/**
 * Processes marketing CSV files and returns structured campaign performance data.
 * 
 * Groups data by URL types (products, collections, homepage) and analyzes 
 * conversion rates and sessions across different marketing platforms.
 *
 * @param {Array} files - Array of file objects with { file, date }
 * @returns {Promise<Object>} Structured marketing performance data
 */
export async function marketingResources([files]) {
  let allSessionData = [];

  // Process each CSV file
  for (const { file, date } of files) {
    const data = await d3.csv(file, (d) => {
      // Skip rows with missing essential data
      if (!d["Landing page URL"] || !d["Sessions"]) return null;

      const landingUrl = d["Landing page URL"];
      let urlType = "other";
      let urlPath = "";

      try {
        const urlObj = new URL(landingUrl);
        const pathname = urlObj.pathname;
        
        // Categorize URL types
        if (pathname === "/" || pathname === "") {
          urlType = "homepage";
          urlPath = "homepage";
        } else if (pathname.startsWith("/products/")) {
          urlType = "product";
          urlPath = pathname.replace("/products/", "");
        } else if (pathname.startsWith("/collections/")) {
          urlType = "collection";
          urlPath = pathname.replace("/collections/", "");
        }

        // Extract UTM parameters
        const utmSource = urlObj.searchParams.get('utm_source') || "";
        const utmMedium = urlObj.searchParams.get('utm_medium') || "";
        const utmCampaign = urlObj.searchParams.get('utm_campaign') || "";

        // Determine platform from UTM source or referrer
        let platform = "other";
        const referrerName = (d["Referrer name"] || "").toLowerCase();
        const source = utmSource.toLowerCase();

        if (source === "ig" || referrerName.includes("instagram")) {
          platform = "instagram";
        } else if (source === "fb" || referrerName.includes("facebook") || referrerName.includes("meta")) {
          platform = "facebook";
        } else if (source === "klaviyo" || utmMedium === "email") {
          platform = "klaviyo";
        } else if (source === "postscript" || utmMedium === "sms") {
          platform = "postscript";
        } else if (source === "ltk" || referrerName.includes("rstyle")) {
          platform = "ltk";
        } else if (source === "shopmy") {
          platform = "shopmy";
        } else if (source === "awin" || utmMedium === "affiliate") {
          platform = "awin";
        }

        return {
          date: new Date("2025-06-06"),
          landingUrl,
          urlType,
          urlPath,
          platform,
          utmSource,
          utmMedium,
          utmCampaign,
          referrerSource: d["Referrer source"] || "",
          referrerName: d["Referrer name"] || "",
          sessions: +d["Sessions"] || 0,
          visitors: +d["Online store visitors"] || 0,
          conversionRate: +d["Conversion rate"] || 0,
          cartAdditions: +d["Sessions with cart additions"] || 0
        };
      } catch (error) {
        // Handle malformed URLs
        return null;
      }
    });

    allSessionData.push(...data.filter(Boolean));
  }

  // Group data by URL type and platform
  const groupedByUrlType = _.groupBy(allSessionData, "urlType");
  
  // Analyze performance by platform for each URL type
  const performanceAnalysis = {};

  for (const [urlType, urlData] of Object.entries(groupedByUrlType)) {
    const platformGroups = _.groupBy(urlData, "platform");
    
    performanceAnalysis[urlType] = {};
    
    for (const [platform, platformData] of Object.entries(platformGroups)) {
      // Skip if not one of our target platforms
      const targetPlatforms = ["instagram", "facebook", "klaviyo", "postscript", "ltk", "shopmy", "awin"];
      if (!targetPlatforms.includes(platform)) continue;

      // Calculate aggregated metrics
      const totalSessions = _.sumBy(platformData, "sessions");
      const totalVisitors = _.sumBy(platformData, "visitors");
      const totalCartAdditions = _.sumBy(platformData, "cartAdditions");
      
      // Calculate weighted conversion rate
      const totalConversions = _.sumBy(platformData, d => d.sessions * d.conversionRate);
      const avgConversionRate = totalSessions > 0 ? totalConversions / totalSessions : 0;

      // Get unique URLs for this platform
      const uniqueUrls = _.uniqBy(platformData, "landingUrl").length;
      
      // Get top performing URLs
      const urlPerformance = _(platformData)
        .groupBy("urlPath")
        .map((urlData, urlPath) => ({
          urlPath,
          sessions: _.sumBy(urlData, "sessions"),
          conversionRate: _.sumBy(urlData, d => d.sessions * d.conversionRate) / _.sumBy(urlData, "sessions"),
          cartAdditions: _.sumBy(urlData, "cartAdditions")
        }))
        .orderBy("sessions", "desc")
        .take(5)
        .value();

      performanceAnalysis[urlType][platform] = {
        totalSessions,
        totalVisitors,
        totalCartAdditions,
        avgConversionRate,
        uniqueUrls,
        topUrls: urlPerformance,
        rawDataCount: platformData.length
      };
    }
  }

  // Calculate overall platform performance
  const overallPlatformPerformance = {};
  const platformGroups = _.groupBy(allSessionData, "platform");

  for (const [platform, platformData] of Object.entries(platformGroups)) {
    const targetPlatforms = ["instagram", "facebook", "klaviyo", "postscript", "ltk", "shopmy", "awin"];
    if (!targetPlatforms.includes(platform)) continue;

    const totalSessions = _.sumBy(platformData, "sessions");
    const totalVisitors = _.sumBy(platformData, "visitors");
    const totalCartAdditions = _.sumBy(platformData, "cartAdditions");
    const totalConversions = _.sumBy(platformData, d => d.sessions * d.conversionRate);
    const avgConversionRate = totalSessions > 0 ? totalConversions / totalSessions : 0;

    overallPlatformPerformance[platform] = {
      totalSessions,
      totalVisitors,
      totalCartAdditions,
      avgConversionRate: avgConversionRate * 100, // Convert to percentage
      cartAdditionRate: totalSessions > 0 ? (totalCartAdditions / totalSessions) * 100 : 0
    };
  }

  return {
    performanceByUrlType: performanceAnalysis,
    overallPlatformPerformance,
    totalSessionsAnalyzed: allSessionData.length,
    dateRange: {
      start: _.minBy(allSessionData, "date")?.date,
      end: _.maxBy(allSessionData, "date")?.date
    },
    platformBreakdown: _(allSessionData)
      .groupBy("platform")
      .mapValues(data => ({
        sessions: _.sumBy(data, "sessions"),
        percentage: (_.sumBy(data, "sessions") / _.sumBy(allSessionData, "sessions")) * 100
      }))
      .value()
  };
}
/*
  * Bundle data
*/

// Alternative function to get ALL orders with bundle discount info
export async function allOrdersWithBundleInfocopy(files) {
  let allData = [];
  let newI = 0;
  // for (const { file, date } of files) {
    const data = await d3.csv(files, (d) => {
      // Parse the Lineitem Properties JSON string
      let lineitemProperties = [];
      let bundleDiscountPercent = null;
      let hasBundle = false;
      
      try {
        
        if (d["Lineitem Properties"] && d["Lineitem Properties"].trim() !== '') {
          lineitemProperties = JSON.parse(d["Lineitem Properties"]);
          const bundleDiscount = lineitemProperties.find(prop => prop.name === "_bundleDiscount");
          if (bundleDiscount) {
            newI += 1;
            // console.log(d["Created At"],lineitemProperties, newI);
            bundleDiscountPercent = +bundleDiscount.value || 0;
            hasBundle = true;
          }
        }
      } catch (e) {
        console.warn(`Failed to parse lineitem properties for order ${d["Order Name"]}:`, e);
      }

      if(!hasBundle)
        return

      // console.log(d["Order Name"])
      return {
        year: "2025-06-06",
        orderName: d["Order Name"] || "UNKNOWN",
        createdAt: d["Created At"] || "",
        source: d["Source"] || "",
        subtotal: +d["Subtotal"] || 0,
        total: +d["Total"] || 0,
        discountAmount: +d["Discount Amount"] || 0,
        numberOfItems: +d["Number of Line Items"] || 0,
        numberOfProducts: +d["Number of Products"] || 0,
        hasBundle: hasBundle,
        bundleDiscountPercent: bundleDiscountPercent,
        skus: d["List of Lineitem SKUs"] || "",
        productNames: d["List of Lineitem Names"] || "",
        customerOrdersCount: +d["Customer Orders Count"] || 0,
        customerTotalSpent: +d["Customer Total Spent"] || 0,
        lineitemProperties: lineitemProperties
      };
    });
    
    allData.push(...data);
  // }

  return allData;
}


// Alternative function to get ALL orders with bundle discount info
export async function allOrdersWithBundleInfo(files) {
  let allData = [];

  let newI = 0;
  for (const { file, date } of files) {
    const data = await d3.csv(file, (d) => {
      // Parse the Lineitem Properties JSON string
      let lineitemProperties = [];
      let bundleDiscountPercent = null;
      let hasBundle = false;
      
      // console.log(d["Lineitem Properties"]);
      try {
        if (d["Lineitem Properties"] && d["Lineitem Properties"].trim() !== '') {
          lineitemProperties = JSON.parse(d["Lineitem Properties"]);
          const bundleDiscount = lineitemProperties.find(prop => prop.name === "_bundleDiscount");
          if (bundleDiscount) {
            // newI += 1;
            // console.log(d["createdAt"], d["Lineitem Properties"], newI);

            bundleDiscountPercent = +bundleDiscount.value || 0;
            hasBundle = true;
          }
        }
      } catch (e) {
        console.warn(`Failed to parse lineitem properties for order ${d["Order Name"]}:`, e);
      }

      if(!hasBundle)
        return

      // console.log(d["Order Name"])
      return {
        year: date,
        orderName: d["Order Name"] || "UNKNOWN",
        createdAt: d["Created At"] || "",
        source: d["Source"] || "",
        subtotal: +d["Subtotal"] || 0,
        total: +d["Total"] || 0,
        discountAmount: +d["Discount Amount"] || 0,
        numberOfItems: +d["Number of Line Items"] || 0,
        numberOfProducts: +d["Number of Products"] || 0,
        hasBundle: hasBundle,
        bundleDiscountPercent: bundleDiscountPercent,
        skus: d["List of Lineitem SKUs"] || "",
        productNames: d["List of Lineitem Names"] || "",
        customerOrdersCount: +d["Customer Orders Count"] || 0,
        customerTotalSpent: +d["Customer Total Spent"] || 0,
        lineitemProperties: lineitemProperties
      };
    });
    
    allData.push(...data);
  }

  return allData;
}

// utilities ----------------------------------------------------
/**
 * Turn any EBY URL into a clean lowercase path – e.g.
 * https://shop.join-eby.com/products/nude-bralette?variant=123  →
 * /products/nude-bralette
 */
export function normalizePath(urlStr = "") {
  try {
    const { pathname } = new URL(urlStr);
    // 1. lower-case
    // 2. trim trailing slash
    // 3. done  →  "/products/nude-bralette"
    return pathname.replace(/\/$/, "").toLowerCase();
  } catch {
    return urlStr.toLowerCase();
  }
}

/** Filter rows whose *clean* path contains the target fragment */
export function filterByPath(rows, target) {
  const want = normalizePath(
    target.startsWith("http") ? target : `https://dummy.com${target}`
  );
  return rows.filter((r) => r.path.includes(want));
}

/** Collapse rows that share the same `.path` (+ optional `year`) */
export function groupRows(
  rows,
  {
    byYear   = false,   // “2025-04|/products/…” key or just path key
    sortBy   = "sessions", // any numeric field: "sessions", "cartAdditions", "cvr"
    desc     = true,    // true = high → low
  } = {}
) {
  const keyFn = (r) => (byYear ? `${r.year}|${r.path}` : r.path);
  const map   = new Map();
  console.log(rows, "look")
  for (const r of rows) {
    const key = keyFn(r);
    const agg = map.get(key) ?? {
      year: r.year,
      path: r.path,
      sessions: 0,
      cartAdditions: 0,
      cvr: r.cvr
    };
    agg.sessions      += r.sessions;
    agg.cartAdditions += r.cartAdditions;
    map.set(key, agg);
  }

  // ---- finish derived metrics & sort ----
  const arr = Array.from(map.values()).map((r) => ({
    ...r,
    cvr: r.sessions ? (r.cartAdditions / r.sessions) * 100 : 0,
  }));

  return arr.sort((a, b) =>
    desc ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]
  );
}

// main ---------------------------------------------------------
export async function marketingSrc(
  files,
  { matchPath, rollup = true, byYear = false } = {}
) {
  const rows = [];

  for (const { file, date } of files) {
    const csvRows = await d3.csv(file, (d) => {

      if(d["Landing page URL"].includes("orders") || d["Landing page URL"].includes("checkout"))
        return

      return {
        year: date,
        url: d["Landing page URL"],
        path: normalizePath(d["Landing page URL"]),
        sessions:      +d["Sessions"]                       || 0,
        cartAdditions: +d["Sessions with cart additions"]   || 0,
        cvr: +d["Conversion rate"]
      }
    });
    rows.push(...csvRows);
  }

  const filtered = matchPath ? filterByPath(rows, matchPath) : rows;
  return rollup ? groupRows(filtered, { byYear }) : filtered;
}


//--------------------------------------------------------------------
// 1.  Detect the marketing “channel” for a single row
//--------------------------------------------------------------------
function detectChannel(urlStr = "", refSource = "", refName = "") {
  // 1 A.  Look at URL query-string
  let channel = "direct"; // sensible default
  try {
    const u   = new URL(urlStr);
    const src = (u.searchParams.get("utm_source") || "").toLowerCase();
    const m   = urlStr.toLowerCase(); // full URL for looser match

    // --- Priority buckets ---
    const force = {
      shopmy: /shopmy/,
      affiliate: /utm_medium=affiliate|aff(?:id|code)|shareasale|impact|rakuten|avantlink|cj(?=\d)|lkt(?=i|k)/,
    };

    if (force.shopmy.test(m))     return "shopmy";
    if (force.affiliate.test(m))  return "affiliate";

    // --- Ranked channel map ---
    const map = [
      ["facebook",   /(^|[._-])fb([._-]|$)|facebook|fbclid/],
      ["instagram",  /instagram|(^|[._-])ig([._-]|$)/],
      ["tiktok",     /(^|[._-])tt([._-]|$)|tiktok/],
      ["twitter",    /(^|[._-])(tw|x)([._-]|$)|twitter\.com|t\.co/],
      ["youtube",    /youtu\.?be|(^|[._-])yt([._-]|$)/],
      ["linkedin",   /linkedin/],
      ["pinterest",  /pinterest|pinimg/],
      ["snapchat",   /snapchat|(^|[._-])sc([._-]|$)|snap\.?com/],
      ["reddit",     /reddit\./],
      ["whatsapp",   /whatsapp/],
      ["messenger",  /messenger/],

      ["google",     /google|gclid|utm_source=adwords/],
      ["bing",       /bing|utm_source=bing/],
      ["yahoo",      /yahoo/],
      ["duckduckgo", /duckduckgo/],

      ["outbrain",   /outbrain/],
      ["taboola",    /taboola/],

      ["postscript", /postscript|utm_medium=sms/],
      ["klaviyo",    /klaviyo/],
      ["email",      /utm_medium=email|newsletter|mailchi\.mp|sendgrid|e-?mail/],
      ["sms",        /utm_medium=sms|textmsg/],

      ["referral",   /utm_medium=referral/],
      ["display",    /utm_medium=display|banner/],
      ["direct",     /^\(direct\)$|utm_medium=direct/],
    ];

    for (const [ch, test] of map) {
      if (test.test(src) || test.test(m)) {
        return ch;
      }
    }

    // --- Fallback to referrer data ---
    const ref = (refSource + refName).toLowerCase();
    if (/shopmy/.test(ref)) return "shopmy";
    // if (/instagram/.test(ref)) return "instagram";
    // if (/facebook/.test(ref)) return "facebook";
  } catch {
    // ignore bad URLs
  }
  return channel;
}

//--------------------------------------------------------------------
// 2.  Crunch rows → { path → channel → {sessions, cartAdditions, cvr} }
//--------------------------------------------------------------------
function makeChannelSummary(rows) {
  const out = {};

  // console.log(rows);
  for (const r of rows) {
    const ch  = detectChannel(r.url, r.referrerSource, r.referrerName);
    const key = r.path;

    // ---------- ensure the row's CVR is numeric ----------
    const safeCVR = r.cvr || 0;  // ← NEW

    // ---------- path bucket ----------
    if (!out[key]) {
      out[key] = {
        path: key,
        totalSessions: 0,
        totalCartAdditions: 0,
        cvrSum: 0,
        cvrCount: 0,
        channels: {},
      };
    }
    const bucket = out[key];

    bucket.totalSessions      += r.sessions;
    bucket.totalCartAdditions += r.cartAdditions;
    bucket.cvrSum             += safeCVR;
    bucket.cvrCount           += 1;

    // ---------- channel bucket ----------
    if (!bucket.channels[ch]) {
      bucket.channels[ch] = {
        sessions: 0,
        cartAdditions: 0,
        cvrSum: 0,
        cvrCount: 0,
      };
    }
    const cb = bucket.channels[ch];
    cb.sessions      += r.sessions;
    cb.cartAdditions += r.cartAdditions;
    cb.cvrSum        += safeCVR;
    cb.cvrCount      += 1;
  }

  // ---------- finalise plain-English metrics ----------
  for (const b of Object.values(out)) {
    b.cvr = b.cvrCount ? (b.cvrSum / b.cvrCount) * 100 : 0;

    for (const cb of Object.values(b.channels)) {
      cb.cvr = cb.cvrCount ? (cb.cvrSum / cb.cvrCount) * 100 : 0;
      delete cb.cvrSum;
      delete cb.cvrCount;
    }
    delete b.cvrSum;
    delete b.cvrCount;
  }

  return out;            // or Object.values(out) if you prefer an array
}


//--------------------------------------------------------------------
// 3.  Convenience wrapper: rows → summary
//--------------------------------------------------------------------
export async function marketingChannelSummary(files, opts = {}) {
  // keep each raw row so channels can be split
  const rows = await marketingSrc(files, { ...opts, rollup: false });

  // attach refSource/name if you kept those columns; otherwise strip from detectChannel
  return makeChannelSummary(rows);
}

/* --------------  HOW TO USE  --------------

{
  path: '/collections/best-sellers',
  totalSessions: 432,
  totalCartAdditions: 38,
  cvr: 8.80,
  channels: {
    instagram: { sessions: 310, cartAdditions: 25, cvr: 8.06 },
    facebook:  { sessions:  72, cartAdditions:  5, cvr: 6.94 },
    shopmy:    { sessions:  24, cartAdditions:  6, cvr: 25.00 },
    direct:    { sessions:  26, cartAdditions:  2, cvr: 7.69 }
  }
}
------------------------------------------- */

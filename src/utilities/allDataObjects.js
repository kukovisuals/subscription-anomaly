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
        debugger
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

export async function marketingResources(files) {
  let allData = [];

  for (const { file, date } of files) {
    const data = await d3.csv(file, (d) => {

      const sources = extractMarketingData(d["Landing page URL"] || "");
      const landing = getPatchUrl(d["Landing page URL"] || "");

      return {
        year: date,
        name: d["Referrer source"] || "UNKNOWN",
        channel: d["Referrer name"] || "direct",
        state: d["Session region"] || "UKNOWN",
        sources: sources,
        landing,
        session: +d["Sessions"] || 0,
        cvr: Math.round(+d["Conversion rate"] * 100) || 0, // Ensure it's a number
        // n: +d["Sessions"] || 0,
        // cartAdditions: +d["Sessions with cart additions"] || 0,
      };
    });
    allData.push(...data);
  }
  // Group by date
  return allData

}

export async function inventoryData(files) {
  let allData = [];

  for (const { file, date } of files) {
    const data = await d3.csv(file, (d) => {
      // return {
      //   year: date,
      //   name: d["Landing page path"] || "UNKNOWN",
      //   n: +d["Sessions"] || 0,
      //   cartAdditions: +d["Sessions with cart additions"] || 0,
      //   cvr: +d["Conversion rate"] * 100 || 0, // Ensure it's a number
      // };
      console.log(d)
    });
    // allData.push(...data);
  }
  // Group by date
  return allData

}

// Comprehensive Marketing Channel & Data Extraction Algorithm
function extractMarketingData(url) {
  if (!url || url === '') {
    return 
  }

  const lowerUrl = url.toLowerCase();
  const keywords = [];
  let platform = null;
  let medium = null;
  let source = null;
  let influencer = null;
  let campaign = null;
  let attribution_platform = null;
  let is_paid = false;
  let is_whitelisting = false;
  let channel = 'Direct';

  // Extract URL parameters
  let params = {};
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      params[key] = decodeURIComponent(value);
    });
  } catch (e) {
    params = {};
  }

  // PLATFORM DETECTION
  if (lowerUrl.includes('instagram') || params.utm_referrer?.includes('instagram')) {
    platform = 'Instagram';
    keywords.push('instagram');
  }
  if (lowerUrl.includes('facebook') || lowerUrl.includes('fb') || lowerUrl.includes('fbclid')) {
    platform = 'Facebook';
    keywords.push('facebook');
  }
  if (lowerUrl.includes('tiktok')) {
    platform = 'TikTok';
    keywords.push('tiktok');
  }
  if (lowerUrl.includes('youtube')) {
    platform = 'YouTube';
    keywords.push('youtube');
  }

  // ATTRIBUTION PLATFORM DETECTION
  if (lowerUrl.includes('grin') || params.platform === 'grin') {
    attribution_platform = 'Grin';
    keywords.push('grin');
  }
  if (lowerUrl.includes('shopmy') || params.utm_source === 'ShopMy') {
    attribution_platform = 'ShopMy';
    keywords.push('shopmy');
  }
  if (lowerUrl.includes('linktr') || lowerUrl.includes('linktree')) {
    attribution_platform = 'Linktree';
    keywords.push('linktree');
  }
  if (lowerUrl.includes('substack')) {
    attribution_platform = 'Substack';
    keywords.push('substack');
  }

  // MEDIUM DETECTION
  if (params.utm_medium) {
    medium = params.utm_medium;
    keywords.push(`medium:${params.utm_medium}`);
  }
  if (lowerUrl.includes('whitelisting')) {
    medium = 'whitelisting';
    is_whitelisting = true;
    is_paid = true;
    keywords.push('whitelisting');
  }
  if (lowerUrl.includes('influencer')) {
    medium = 'influencer';
    keywords.push('influencer');
  }
  if (lowerUrl.includes('paidsocial')) {
    medium = 'paidsocial';
    is_paid = true;
    keywords.push('paidsocial');
  }

  // SOURCE DETECTION
  if (params.utm_source) {
    source = params.utm_source;
    keywords.push(`source:${params.utm_source}`);
  }

  // INFLUENCER NAME EXTRACTION (multiple methods)
  if (params.utm_term) {
    influencer = params.utm_term;
  } else if (params.utm_campaign && attribution_platform === 'ShopMy') {
    influencer = params.utm_campaign; // ShopMy uses campaign for influencer name
  } else if (params.utm_campaign_id) {
    influencer = params.utm_campaign_id; // Grin uses campaign_id for influencer handle
  }

  // Clean influencer name
  if (influencer) {
    influencer = influencer
      .replace(/[+%7C|]/g, ' ') // Replace URL encoded chars
      .replace(/\s+/g, ' ')      // Multiple spaces to single
      .trim();
  }

  // CAMPAIGN DETECTION
  if (params.utm_campaign) {
    campaign = params.utm_campaign;
  }

  // SPECIAL URL PATTERN DETECTION
  if (lowerUrl.includes('nbt=nb%3afb')) {
    platform = 'Facebook';
    is_paid = true;
    keywords.push('facebook-ads');
  }

  // CHANNEL CLASSIFICATION LOGIC
  if (is_whitelisting) {
    channel = 'Paid Social - Whitelisting';
  } else if (medium === 'influencer' && attribution_platform === 'Grin') {
    channel = 'Influencer Marketing - Grin';
  } else if (attribution_platform === 'ShopMy') {
    channel = 'Influencer Marketing - ShopMy';
  } else if (attribution_platform === 'Linktree') {
    channel = 'Link in Bio';
  } else if (platform === 'Facebook' && is_paid) {
    channel = 'Facebook Ads';
  } else if (platform === 'Instagram' && is_paid) {
    channel = 'Instagram Ads';
  } else if (medium === 'paidsocial') {
    channel = 'Paid Social';
  } else if (source === 'organicsocial') {
    channel = 'Organic Social';
  } else if (params.utm_source || params.utm_medium) {
    channel = 'UTM Tracked';
  } else if (lowerUrl.includes('shop.join-eby.com') && Object.keys(params).length === 0) {
    channel = 'Direct';
  } else {
    channel = 'Other';
  }

  return {
    channel,
    platform,
    medium,
    source,
    influencer,
    campaign,
    attribution_platform,
    keywords,
    is_paid,
    is_whitelisting,
    raw_params: params
  };
}

// Alternative function to get ALL orders with bundle discount info
export async function allOrdersWithBundleInfo(files) {
  let allData = [];

  for (const { file, date } of files) {
    const data = await d3.csv(file, (d) => {
      // Parse the Lineitem Properties JSON string
      let lineitemProperties = [];
      let bundleDiscountPercent = null;
      let hasBundle = false;
      
      try {
        if (d["Lineitem Properties"] && d["Lineitem Properties"].trim() !== '') {
          lineitemProperties = JSON.parse(d["Lineitem Properties"]);
          const bundleDiscount = lineitemProperties.find(prop => prop.name === "_bundleDiscount");
          if (bundleDiscount) {
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

function getPatchUrl(url) 
{
  const splitUrl = url.split(".com");
  let finalPath = "";
  if(splitUrl.length > 0 && splitUrl[1] !== undefined)
  {
    finalPath = splitUrl[1].split("?")[0];
  } 
  return finalPath;
}
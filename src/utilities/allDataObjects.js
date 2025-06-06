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


/*
  * Marketing data
*/
export async function marketingResources(files) {
  let allData = [];

  for (const { file, date } of files) {
    const data = await d3.csv(file, (d) => {
      const marketingInfo = extractMarketingInfo(d["Landing page URL"] || "");
      const landingPageType = classifyLandingPage(d["Landing page URL"] || "");

      return {
        year: date,
        referrerSource: d["Referrer source"] || "unknown",
        referrerName: d["Referrer name"] || "unknown", 
        sessionRegion: d["Session region"] || "unknown",
        landingPageUrl: d["Landing page URL"] || "",
        landingPageType: landingPageType,
        sessions: +d["Sessions"] || 0,
        conversionRate: +d["Conversion rate"] || 0,
        conversions: Math.round((+d["Sessions"] || 0) * (+d["Conversion rate"] || 0)),
        visitors: +d["Online store visitors"] || 0,
        cartAdditions: +d["Sessions with cart additions"] || 0,
        // Marketing attribution
        platform: marketingInfo.platform,
        campaign: marketingInfo.campaign,
        influencer: marketingInfo.influencer,
        channel: marketingInfo.channel,
        medium: marketingInfo.medium,
        isPaid: marketingInfo.isPaid,
        isWhitelisting: marketingInfo.isWhitelisting
      };
    });
    allData.push(...data);
  }

  return generateCVRAnalysis(allData);
}

// Helper function to extract marketing information from URLs
function extractMarketingInfo(url) {
  if (!url || url === '') {
    return {
      platform: 'unknown',
      campaign: 'unknown',
      influencer: null,
      channel: 'Direct',
      medium: null,
      isPaid: false,
      isWhitelisting: false
    };
  }

  const lowerUrl = url.toLowerCase();
  let platform = 'unknown';
  let campaign = 'unknown';
  let influencer = null;
  let channel = 'Direct';
  let medium = null;
  let isPaid = false;
  let isWhitelisting = false;

  // Extract URL parameters
  let params = {};
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      params[key] = decodeURIComponent(value);
    });
  } catch (e) {
    // If URL parsing fails, try to extract from query string
    const queryString = url.split('?')[1];
    if (queryString) {
      const pairs = queryString.split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });
    }
  }

  // Platform detection
  if (params.platform) {
    platform = params.platform;
  } else if (params.utm_source) {
    platform = params.utm_source;
  } else if (lowerUrl.includes('facebook') || lowerUrl.includes('fb')) {
    platform = 'facebook';
  } else if (lowerUrl.includes('instagram')) {
    platform = 'instagram';
  } else if (lowerUrl.includes('tiktok')) {
    platform = 'tiktok';
  } else if (lowerUrl.includes('youtube')) {
    platform = 'youtube';
  } else if (lowerUrl.includes('grin')) {
    platform = 'grin';
  } else if (lowerUrl.includes('shopmy')) {
    platform = 'ShopMy';
  }

  // Campaign detection
  if (params.utm_campaign) {
    campaign = params.utm_campaign;
  } else if (params.campaign) {
    campaign = params.campaign;
  }

  // Influencer detection
  if (params.utm_term) {
    influencer = params.utm_term;
  } else if (platform === 'ShopMy' && campaign !== 'unknown') {
    influencer = campaign; // ShopMy uses campaign field for influencer names
  }

  // Medium detection
  if (params.utm_medium) {
    medium = params.utm_medium;
    if (medium === 'whitelisting') {
      isWhitelisting = true;
      isPaid = true;
    }
  }

  // Channel classification
  if (isWhitelisting) {
    channel = 'Paid Social - Whitelisting';
  } else if (platform === 'grin' || platform === 'Grin') {
    channel = 'Influencer Marketing - Grin';
  } else if (platform === 'ShopMy') {
    channel = 'Influencer Marketing - ShopMy';
  } else if (platform === 'organicsocial') {
    channel = 'Organic Social';
  } else if (platform === 'search') {
    channel = 'Search';
  } else if (platform === 'postscript') {
    channel = 'SMS Marketing';
  } else if (platform === 'Klaviyo') {
    channel = 'Email Marketing';
  } else if (platform === 'direct') {
    channel = 'Direct';
  } else if (platform !== 'unknown') {
    channel = 'Other Paid';
    isPaid = true;
  }

  return {
    platform,
    campaign,
    influencer,
    channel,
    medium,
    isPaid,
    isWhitelisting
  };
}

// Helper function to classify landing pages
function classifyLandingPage(url) {
  if (!url) return 'unknown';
  
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('best-seller')) {
    return 'best-sellers';
  } else if (lowerUrl.includes('collections/')) {
    // Extract collection name after 'collections/'
    const match = lowerUrl.match(/collections\/([^?&/]+)/);
    return match ? `collection-${match[1]}` : 'collection';
  } else if (lowerUrl.includes('/products/')) {
    // Extract specific product name after 'products/'
    const match = lowerUrl.match(/products\/([^?&/]+)/);
    return match ? `product-${match[1]}` : 'product-page';
  } else if (lowerUrl === 'https://shop.join-eby.com/' || lowerUrl.endsWith('join-eby.com/')) {
    return 'homepage';
  } else {
    return 'other';
  }
}

// Helper function to generate CVR analysis data
function generateCVRAnalysis(allData) {
  // Group ALL data by platform, campaign, and landing page type (not just best-sellers)
  const campaignGroups = groupByCampaign(allData);
  
  // Calculate CVR metrics for each campaign-landing page combination
  const cvrAnalysis = campaignGroups.map(group => {
    const weightedCVR = group.totalSessions > 0 ? 
      (group.totalConversions / group.totalSessions) * 100 : 0;
    
    return {
      platform: group.platform,
      campaign: group.campaign,
      channel: group.channel,
      influencer: group.influencer,
      landingPageType: group.landingPageType,
      totalSessions: group.totalSessions,
      totalConversions: group.totalConversions,
      totalVisitors: group.totalVisitors,
      totalCartAdditions: group.totalCartAdditions,
      conversionRate: Math.round(weightedCVR * 100) / 100,
      isLowPerforming: weightedCVR < 2.0, // Below 2% CVR
      performanceLevel: getPerformanceLevel(weightedCVR),
      dataPoints: group.dataPoints,
      regions: group.regions,
      landingPages: group.landingPages,
      uniqueLandingPages: group.uniqueLandingPages
    };
  })
  .filter(item => item.totalSessions >= 5) // Filter for meaningful traffic
  .sort((a, b) => a.conversionRate - b.conversionRate); // Sort by CVR ascending

  // Calculate overall metrics for ALL data
  const totalSessions = allData.reduce((sum, row) => sum + row.sessions, 0);
  const totalConversions = allData.reduce((sum, row) => sum + row.conversions, 0);
  const overallCVR = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

  // Calculate best-sellers specific metrics for backward compatibility
  const bestSellersData = allData.filter(row => row.landingPageType === 'best-sellers');
  const bestSellersSessions = bestSellersData.reduce((sum, row) => sum + row.sessions, 0);
  const bestSellersConversions = bestSellersData.reduce((sum, row) => sum + row.conversions, 0);
  const bestSellersCVR = bestSellersSessions > 0 ? (bestSellersConversions / bestSellersSessions) * 100 : 0;

  // Get unique landing page types for filtering options
  const landingPageTypes = [...new Set(allData.map(row => row.landingPageType))];

  return {
    summary: {
      totalCampaigns: cvrAnalysis.length,
      lowPerformingCampaigns: cvrAnalysis.filter(c => c.isLowPerforming).length,
      totalSessions,
      totalConversions,
      overallCVR: Math.round(overallCVR * 100) / 100,
      benchmarkCVR: 2.0,
      // Best-sellers specific metrics
      bestSellersSessions,
      bestSellersConversions,
      bestSellersCVR: Math.round(bestSellersCVR * 100) / 100,
      // Available landing page types for filtering
      availableLandingPageTypes: landingPageTypes
    },
    campaigns: cvrAnalysis,
    lowPerformers: cvrAnalysis.filter(c => c.isLowPerforming),
    topPerformers: cvrAnalysis.filter(c => !c.isLowPerforming).slice(-5).reverse(),
    allData: allData, // Include full dataset for additional analysis
    bestSellersData: bestSellersData, // Include filtered best-sellers data
    // Helper function to filter by landing page type
    filterByLandingPageType: function(landingPageType) {
      return {
        campaigns: this.campaigns.filter(c => c.landingPageType === landingPageType),
        summary: {
          ...this.summary,
          filteredType: landingPageType,
          filteredCampaigns: this.campaigns.filter(c => c.landingPageType === landingPageType).length,
          filteredLowPerforming: this.campaigns.filter(c => c.landingPageType === landingPageType && c.isLowPerforming).length
        }
      };
    }
  };
}

// Helper function to group data by campaign and landing page type
function groupByCampaign(data) {
  const groups = {};
  
  data.forEach(row => {
    const key = `${row.platform}|${row.campaign}|${row.landingPageType}`;
    
    if (!groups[key]) {
      groups[key] = {
        platform: row.platform,
        campaign: row.campaign,
        channel: row.channel,
        influencer: row.influencer,
        landingPageType: row.landingPageType,
        totalSessions: 0,
        totalConversions: 0,
        totalVisitors: 0,
        totalCartAdditions: 0,
        dataPoints: 0,
        regions: new Set(),
        landingPages: new Set()
      };
    }
    
    groups[key].totalSessions += row.sessions;
    groups[key].totalConversions += row.conversions;
    groups[key].totalVisitors += row.visitors;
    groups[key].totalCartAdditions += row.cartAdditions;
    groups[key].dataPoints += 1;
    groups[key].regions.add(row.sessionRegion);
    groups[key].landingPages.add(row.landingPageUrl);
  });
  
  // Convert sets to arrays and return values
  return Object.values(groups).map(group => ({
    ...group,
    regions: Array.from(group.regions),
    landingPages: Array.from(group.landingPages),
    uniqueLandingPages: group.landingPages.size
  }));
}

// Helper function to classify performance levels
function getPerformanceLevel(cvr) {
  if (cvr === 0) return 'Critical';
  if (cvr < 1) return 'Poor';
  if (cvr < 2) return 'Below Average';
  if (cvr < 3) return 'Average';
  if (cvr < 5) return 'Good';
  return 'Excellent';
}
/*
  * Bundle data
*/

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
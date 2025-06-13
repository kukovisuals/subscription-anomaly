import { useEffect, useState, useRef, useCallback } from "react";
import * as d3 from "d3";
import { fileOrders, onlyProducts, landingPageArrs, reviewsStamps, sessionRef, customBundler } from './utilities/allFiles';
import { productSales, subscriptionSales, landingPages, reviewsCleanup, reviewsTokens, marketingSrc, allOrdersWithBundleInfo,marketingChannelSummary } from './utilities/allDataObjects';

import CheaterScatterPlot from './components/CheaterScatterPlot';
import StackedBars from './components/StackProducts';
import LandingPagesLine from './components/LandingPagesLines';
import CheaterSankeyDiagram from './components/CheaterSankeyDiagram';
import StackReviews from "./components/StackReviews";
import TextChartReviews from "./components/TextChartReviews";
import LandingsBars from "./components/LandingsBars";
import CustomBuilder from "./components/CustomBuilder";
import MarketingScatter from "./components/MarketingScatter";

function App() {
  const [view, setView] = useState("products"); // "products", "landingPages", "subscriptions"

  const [sankeyData, setSankeyData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [landingPagesCn, setLandingPagesCn] = useState([]);

  const [sankeyDataRelief, setSankeyDataRelief] = useState([]);
  const [sankeyDataSupport, setSankeyDataSupport] = useState([]);
  const [sankeyDataSheer, setSankeyDataSheer] = useState([]);
  const [sankeyDataWireless, setSankeyDataWireless] = useState([]);

  const [reviewsData, setReviewsData] = useState([]);
  const [textReviewsData, setTextReviewsData] = useState([]);

  const [marketingData, setMarketingData] = useState([]);
  const [customBuildSet, setCustomBuildSet] = useState([]);

  const [loading, setLoading] = useState(true);
  const isFirstRender = useRef(true);
  const [fileData, setFileData] = useState([]);


  const handleFiles = useCallback(async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;

    try{
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('windows-1252'); // or 'iso-8859-1'
      const text = decoder.decode(arrayBuffer);

      const rows = d3.csvParse(text); 

      const parsed = await marketingChannelSummary(rows)
      setMarketingData(parsed);
      setFileData(rows);
    } catch (err) {
      console.error("Error in marketing", err);
    }
  }, []);
  
  const handleFilesPages = useCallback(async (evt) => {
    const files = Array.from(evt.target.files ?? []);
    if (!files.length) return;

    const allParsed = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const csvText = await file.text();
      const rows = d3.csvParse(csvText);

      // Force date based on index: 0 = yesterday, 1 = two days ago, etc.
      const forceDate = new Date();
      forceDate.setDate(forceDate.getDate() - (i + 1)); // yesterday = i+1

      const parsed = await landingPages(rows, forceDate);
      allParsed.push(...parsed); // combine all files into one array
    }

    setLandingPagesCn(allParsed);
  }, []);


  useEffect(() => {
    if (!isFirstRender.current) return;
    isFirstRender.current = false;

    async function loadData() {
      setLoading(true);
      try {
        const suspiciousOrders = await subscriptionSales(fileOrders);
        const productOrders = await productSales(onlyProducts);
        const reviewsCsv = await reviewsCleanup(reviewsStamps);
        const reviewsTextCsv = await reviewsTokens(reviewsStamps);
        // const landingPagesCsv = await landingPages(landingPageArrs);
        // const inventoryDataCsv = await inventoryData(inventoryFiles);
        // const marketingDataCsv = await marketingResources(setsBundles);
        // const marketingDataCsv = await marketingSrc(sessionRef);
        // const marketingDataCsv = await marketingChannelSummary(sessionRef);
        const customBuildCsv = await allOrdersWithBundleInfo(customBundler);
        
        setSankeyData(suspiciousOrders);
        setProductData(productOrders);
        setReviewsData(reviewsCsv);
        setTextReviewsData(reviewsTextCsv);
        // setMarketingData(marketingDataCsv);
        // setLandingPagesCn(landingPagesCsv);
        setCustomBuildSet(customBuildCsv);

        setSankeyDataRelief(suspiciousOrders.filter(order => order.items[0]?.subsType === "Custom Relief Bra Set Subscription Box"));
        setSankeyDataSupport(suspiciousOrders.filter(order => order.items[0]?.subsType === "Custom Support Bra Set Subscription Box"));
        setSankeyDataSheer(suspiciousOrders.filter(order => order.items[0]?.subsType === "Custom Sheer Bra Set Subscription Box"));
        setSankeyDataWireless(suspiciousOrders.filter(order => order.items[0]?.subsType === "Custom Wireless Bra Set Subscription Box"));
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <div>Loading data...</div>;
  // console.log(customBuildSet);
  // console.log(marketingData); 
  // console.log(fileData, "file data")
  return (
    <div className="app-container">
      <div className="app-wrapper">

        {/* Navigation Menu */}
        <div className="menu">
          <button className="menu-first-child" onClick={() => setView("landingPages")}>Landing Pages</button>
          <button onClick={() => setView("products")}>Products</button>
          <button onClick={() => setView("subscriptions")}>Subscriptions</button>
          <button onClick={() => setView("bundler")}>bundler</button>
          <button onClick={() => setView("marketing")}>marketing</button>
          <button onClick={() => setView("reviews")}>Reviews</button>
        </div>
      </div>
      <div className="dashboard-container">

      {view === "landingPages" && (
          <div>
            <section style={{ padding: "1rem", border: "1px solid #ccc" }}>
              <label htmlFor="csv-input">
                <strong>Select Both files</strong>
                <p>1st file must be yesterday</p>
                <p>2nd file must be two days ago</p>
                <a href="https://admin.shopify.com/store/eby-by-sofia-vergara/analytics/reports/135004204?ql=FROM+sessions%0A++SHOW+online_store_visitors%2C+sessions%2C+sessions_with_cart_additions%2C%0A++++sessions_that_reached_checkout%2C+conversion_rate%0A++WHERE+landing_page_path+IS+NOT+NULL%0A++GROUP+BY+landing_page_type%2C+landing_page_path+WITH+TOTALS%2C+PERCENT_CHANGE%0A++DURING+yesterday%0A++COMPARE+TO+previous_period%0A++ORDER+BY+sessions+DESC%0A++LIMIT+1000%0AVISUALIZE+sessions%2C+online_store_visitors%2C+sessions_with_cart_additions%2C%0A++sessions_that_reached_checkout+TYPE+list_with_dimension_values">Link for report</a>
              </label>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                multiple
                onChange={handleFilesPages}
                style={{ display: "block", margin: "1rem 0" }}
              />
            </section>
            <h2>Landing Pages - Cart sessions over 100/day</h2>
            <LandingPagesLine data={landingPagesCn.filter(d => d.cartAdditions > 100)} containerId="chart-high" />
            <h3>Sessions</h3>
            <LandingsBars data={landingPagesCn.filter(d => d.cartAdditions > 100)} containerId="bar-chart-high" />
            <h2>Landing Pages - Cart sessions 30-100/day</h2>
            <LandingPagesLine data={landingPagesCn.filter(d => d.cartAdditions < 100 && d.cartAdditions > 30)} containerId="chart-mid" />
            <h3>Sessions</h3>
            <LandingsBars data={landingPagesCn.filter(d => d.cartAdditions < 100 && d.cartAdditions > 30)} containerId="bar-chart-mid" />
            <h2>Landing Pages - Cart sessions 10-30/day</h2>
            <LandingPagesLine data={landingPagesCn.filter(d => d.cartAdditions < 30 && d.cartAdditions > 10)} containerId="chart-low" />
            <h3>Sessions</h3>
            <LandingsBars data={landingPagesCn.filter(d => d.cartAdditions < 30 && d.cartAdditions > 10)} containerId="bar-chart-low" />
            <h2>Landing Pages - Cart sessions 5-10/day</h2>
            <LandingPagesLine data={landingPagesCn.filter(d => d.cartAdditions < 10 && d.cartAdditions > 5)} containerId="chart-low-low" />
            <h3>Sessions</h3>
            <LandingsBars data={landingPagesCn.filter(d => d.cartAdditions < 10 && d.cartAdditions > 5)} containerId="bar-chart-low-low" />
            {/* <h2>Landing Pages - Cart sessions 10-50/day</h2>
            <LandingPagesLine data={landingPagesCn.filter(d => d.cartAdditions < 20 && d.cartAdditions > 10)} containerId="chart-low-low" /> */}
          </div>
        )}

        {view === "products" && (
          <div>
            <StackedBars data={productData} />
          </div>
        )}

        {view === "subscriptions" && (
          <div>
            <h2>Relief Bra - Set Subscription</h2>
            <CheaterSankeyDiagram data={sankeyDataRelief} width={2000} height={1000} isSet={"Relief Bra"} />
            <h2>Support Bra - Set Subscription</h2>
            <CheaterSankeyDiagram data={sankeyDataSupport} width={2000} height={1000} isSet={"Support Bra"} />
            <h2>Sheer Bra - Set Subscription</h2>
            <CheaterSankeyDiagram data={sankeyDataSheer} width={2000} height={1000} isSet={"Sheer Bra"} />
            <h2>Wireless Bra - Set Subscription</h2>
            <CheaterSankeyDiagram data={sankeyDataWireless} width={2000} height={1000} isSet={"Wireless Bra"} />
            <h2>All - Set Subscription</h2>
            <CheaterSankeyDiagram data={sankeyData} width={2000} height={1000} isSet={""} />
            <h2>Suspicious Orders Flow</h2>
            <CheaterScatterPlot data={sankeyData} width={1500} height={700} />
          </div>
        )}

        {view === "bundler" && (
          <div>
            <CustomBuilder data={customBuildSet} containerId="d-custom-builder"/>
          </div>
        )}

        {
          view == "marketing" && (
            <div className="p-6 bg-gray-50 min-h-screen">
                <section style={{ padding: "1rem", border: "1px solid #ccc" }}>
                <label htmlFor="csv-input">
                  <strong>Select CSV file(s)</strong>
                  <a href="https://admin.shopify.com/store/eby-by-sofia-vergara/analytics/reports/57999404?ql=FROM+sessions%0A++SHOW+online_store_visitors%2C+sessions%2C+conversion_rate%2C%0A++++sessions_with_cart_additions%0A++WHERE+landing_page_url+CONTAINS+%27%2Fproducts%2Fblack-and-nude-relief-bra-bundle%27%0A++GROUP+BY+referrer_source%2C+referrer_name%2C+session_region%2C+landing_page_url+WITH%0A++++TOTALS%0A++SINCE+yesterday+UNTIL+yesterday%0A++ORDER+BY+sessions+DESC%0A++LIMIT+1000%0AVISUALIZE+sessions+TYPE+horizontal_bar">Report link</a>
                </label>
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={handleFiles}
                  style={{ display: "block", margin: "1rem 0" }}
                />
                
              </section>
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6">Marketing Campaign Analysis</h1>
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <MarketingScatter data={marketingData} width={900} height={600} containerId="marketing-1"/>
                    </div>
                </div>
            </div>
          )
        }

        {view === "reviews" && (
          <div>
            <h2>Subscription data</h2>
            <StackReviews data={reviewsData.filter(d => d.product.includes("subscription"))} width={700} height={600} />
            <h2>Subscription Sentiment</h2>
            <TextChartReviews data={textReviewsData.filter(d => d.product.includes("subscription"))} width={700} height={600} />
            {/* <h2>Relief Products</h2>
            <StackReviews data={
              reviewsData.filter(d => !d.product.includes("subscription") && d.product.includes("relief"))
            } width={700} height={500}/>
            <h2>Relief Bra Sentiment</h2>
            <TextChartReviews data={
              textReviewsData.filter(d => !d.product.includes("subscription") && d.product.includes("relief"))
            } width={700} height={600}/>
            <h2>Sheer Sentiment</h2>
            <StackReviews data={
              reviewsData.filter(d => !d.product.includes("subscription") && d.product.includes("mesh"))
            } width={700} height={800}/>
            <h2>Sheer Sentiment</h2>
            <TextChartReviews data={
              textReviewsData.filter(d => !d.product.includes("subscription") && d.product.includes("mesh"))
            } width={700} height={600}/>

            <h2>3D Bra Sentiment</h2>
            <StackReviews data={
              reviewsData.filter(d => !d.product.includes("subscription") && d.product.includes("3d"))
            } width={700} height={500}/>
            <h2>3D Bra Sentiment</h2>
            <TextChartReviews data={
              textReviewsData.filter(d => !d.product.includes("subscription") && d.product.includes("3d"))
            } width={700} height={600}/>

            <h2>Balconette Bra Sentiment</h2>
            <StackReviews data={
              reviewsData.filter(d => !d.product.includes("subscription") && d.product.includes("balconette"))
            } width={700} height={500}/>
            <h2>Balconette Bra Sentiment</h2>
            <TextChartReviews data={
              textReviewsData.filter(d => !d.product.includes("subscription") && d.product.includes("balconette"))
            } width={700} height={600}/>

            <h2>Support and wireless Bra Sentiment</h2>
            <StackReviews data={
              reviewsData.filter(d => !d.product.includes("subscription") && !d.product.includes("balconette") && !d.product.includes("3d") && !d.product.includes("mesh") && !d.product.includes("relief") && d.product.includes("bra"))
            } width={700} height={500}/>
            <h2>Support and wireless Bra Sentiment</h2>
            <TextChartReviews data={
              textReviewsData.filter(d => !d.product.includes("subscription") && !d.product.includes("balconette") && !d.product.includes("3d") && !d.product.includes("mesh") && !d.product.includes("relief") && d.product.includes("bra"))
            } width={700} height={600}/> */}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;



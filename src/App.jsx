import { useEffect, useState, useRef } from "react";
import { fileOrders, onlyProducts, landingPageArrs } from './utilities/allFiles';
import { productSales, subscriptionSales, landingPages } from './utilities/allDataObjects';

import CheaterScatterPlot from './components/CheaterScatterPlot';
import StackedBars from './components/StackProducts';
import LandingPagesLine from './components/LandingPagesLines';
import CheaterSankeyDiagram from './components/CheaterSankeyDiagram';

function App() {
  const [view, setView] = useState("products"); // "products", "landingPages", "subscriptions"

  const [sankeyData, setSankeyData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [landingPagesCn, setLandingPagesCn] = useState([]);

  const [sankeyDataRelief, setSankeyDataRelief] = useState([]);
  const [sankeyDataSupport, setSankeyDataSupport] = useState([]);
  const [sankeyDataSheer, setSankeyDataSheer] = useState([]);
  const [sankeyDataWireless, setSankeyDataWireless] = useState([]);

  const [loading, setLoading] = useState(true);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isFirstRender.current) return;
    isFirstRender.current = false;

    async function loadData() {
      setLoading(true);
      try {
        const suspiciousOrders = await subscriptionSales(fileOrders);
        const productOrders = await productSales(onlyProducts);
        const landingPagesCsv = await landingPages(landingPageArrs);

        setSankeyData(suspiciousOrders);
        setProductData(productOrders);
        setLandingPagesCn(landingPagesCsv);

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

  return (
    <div className="app-container">
      <div className="app-wrapper">

        {/* Navigation Menu */}
        <div className="menu">
          <button className="menu-first-child" onClick={() => setView("products")}>Products</button>
          <button onClick={() => setView("landingPages")}>Landing Pages</button>
          <button onClick={() => setView("subscriptions")}>Subscriptions</button>
        </div>
      </div>
      <div className="dashboard-container">

        {/* Render based on selected view */}
        {view === "products" && (
          <div>
            <StackedBars data={productData} />
          </div>
        )}

        {view === "landingPages" && (
          <div>
            <h2>Landing Pages - Cart sessions over 100/day</h2>
            <LandingPagesLine data={landingPagesCn.filter(d => d.cartAdditions > 100 && d.name !== "/")} containerId="chart-high" />
            <h2>Landing Pages - Cart sessions 50-100/day</h2>
            <LandingPagesLine data={landingPagesCn.filter(d => d.cartAdditions < 100 && d.cartAdditions > 50)} containerId="chart-mid" />
            <h2>Landing Pages - Cart sessions 10-50/day</h2>
            <LandingPagesLine data={landingPagesCn.filter(d => d.cartAdditions < 50 && d.cartAdditions > 10)} containerId="chart-low" />
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
      </div>
    </div>
  );
}

export default App;

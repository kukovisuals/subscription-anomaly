import { fileOrders, onlyProducts, landingPageArrs } from './utilities/allFiles';

import { useEffect, useState, useRef } from "react";
import { productSales, subscriptionSales, landingPages } from './utilities/allDataObjects';
import CheaterScatterPlot from './components/CheaterScatterPlot';
import StackedBars from './components/StackProducts';
import LandingPagesLine from './components/LandingPagesLines';
import CheaterSankeyDiagram from './components/CheaterSankeyDiagram';

function App() {
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
    if (!isFirstRender.current) return; // Ensures it runs only once
    isFirstRender.current = false;
    async function loadData() {
      setLoading(true);
      try {
        const suspiciousOrders = await subscriptionSales(fileOrders); // Adjust based on how you fetch data
        const productOrders = await productSales(onlyProducts); // Adjust based on how you fetch data
        const landingPagesCsv = await landingPages(landingPageArrs)
        setSankeyData(suspiciousOrders);
        setProductData(productOrders);
        setLandingPagesCn(landingPagesCsv);

        // Separate orders into Relief, Support, and Sheer categories
        const sankeyDataRelief = suspiciousOrders.filter(order =>
          order.items[0]?.subsType === "Custom Relief Bra Set Subscription Box"
        );

        const sankeyDataSupport = suspiciousOrders.filter(order =>
          order.items[0]?.subsType === "Custom Support Bra Set Subscription Box"
        );

        const sankeyDataSheer = suspiciousOrders.filter(order =>
          order.items[0]?.subsType === "Custom Sheer Bra Set Subscription Box"
        );

        const sankeyDataWireless = suspiciousOrders.filter(order =>
          order.items[0]?.subsType === "Custom Wireless Bra Set Subscription Box"
        );

        setSankeyDataRelief(sankeyDataRelief);
        setSankeyDataSupport(sankeyDataSupport);
        setSankeyDataSheer(sankeyDataSheer);
        setSankeyDataWireless(sankeyDataWireless);
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
      <StackedBars data={productData} />
      <h2>Landing pages with cart sessions over 100 per day.</h2>
      <LandingPagesLine data={landingPagesCn.filter((d) => d.cartAdditions > 100 && d.name != "/")} containerId="chart-high" />
      <h2>Landing pages with cart sessions over 50 but less then 100 per day.</h2>
      <LandingPagesLine data={landingPagesCn.filter((d) => d.cartAdditions < 100 && d.cartAdditions > 50)} containerId="chart-mid" />
      <h2>Landing pages with cart sessions over 10 but less then 50 per day.</h2>
      <LandingPagesLine data={landingPagesCn.filter((d) => d.cartAdditions < 50 && d.cartAdditions > 10)} containerId="chart-low" />
      <h2>Suspicious Orders Flow</h2>
      <CheaterScatterPlot data={sankeyData} width={1500} height={700} />
      <h2>Relief Bra - Set Subscription</h2>
      <CheaterSankeyDiagram data={sankeyDataRelief} width={1700} height={1000} isSet={"Relief Bra"} />
      <h2>Support Bra - Set Subscription</h2>
      <CheaterSankeyDiagram data={sankeyDataSupport} width={1700} height={1000} isSet={"Support Bra"} />
      <h2>Sheer Bra - Set Subscription</h2>
      <CheaterSankeyDiagram data={sankeyDataSheer} width={1700} height={1000} isSet={"Sheer Bra"} />
      <h2>Wireless Bra - Set Subscription</h2>
      <CheaterSankeyDiagram data={sankeyDataWireless} width={1700} height={1000} isSet={"Wireless Bra"} />
      <h2>All - Set Subscription</h2>
      <CheaterSankeyDiagram data={sankeyData} width={1700} height={1000} isSet={""} />
    </div>
  );
}

export default App;

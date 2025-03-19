import { fileOrders, onlyProducts, landingPageArrs } from './utilities/allFiles';

import { useEffect, useState, useRef } from "react";
import { productSales, subscriptionSales, landingPages } from './utilities/allDataObjects';
// import CheaterSankeyChart from "./components/CheaterSankeyChart";
import CheaterScatterPlot from './components/CheaterScatterPlot';
// import CheaterHeatmap from './components/CheaterHeatmap';
import StackedBars from './components/StackProducts';
import LandingPagesLine from './components/LandingPagesLines';
import CheaterSankeyDiagram from './components/CheaterSankeyDiagram';

function App() {
  const [sankeyData, setSankeyData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [landingPagesCn, setLandingPagesCn] = useState([]);
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
      <LandingPagesLine data={landingPagesCn.filter((d) => d.cartAdditions > 100 && d.name != "/")}  containerId="chart-high"/>
      <LandingPagesLine data={landingPagesCn.filter((d) => d.cartAdditions < 100 && d.cartAdditions > 50)}  containerId="chart-mid"/>
      <LandingPagesLine data={landingPagesCn.filter((d) => d.cartAdditions < 50 && d.cartAdditions > 10)}  containerId="chart-low"/>
      <h2>Suspicious Orders Flow</h2>
      <CheaterScatterPlot data={sankeyData} width={1500} height={700} />
      <h2>Products Bought - Set Subscription</h2>
      <CheaterSankeyDiagram data={sankeyData} width={1500} height={1000} isSet={true}/>
      {/* <h1>Panties in Subscription</h1>
      <CheaterSankeyDiagram data={sankeyDataOther} width={1500} height={1000} isSet={false}/> */}
    </div>
  );
}

export default App;

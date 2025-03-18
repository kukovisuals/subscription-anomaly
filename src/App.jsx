import { fileOrders, onlyProducts, landingPageArrs } from './utilities/allFiles';

import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const suspiciousOrders = await subscriptionSales(fileOrders); // Adjust based on how you fetch data
        const productOrders = await productSales(onlyProducts); // Adjust based on how you fetch data
        const landingPagesCsv = await landingPages(landingPageArrs)
        setSankeyData(suspiciousOrders);
        setProductData(productOrders);
        setLandingPagesCn(landingPagesCsv);
        
        // console.log(suspiciousOrders)
        // console.log('product data below')
        // console.log(productOrders);

        // console.log('Landing Pages')
        // console.log(productOrders);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <div>Loading data...</div>;

  // Filter products for Sankey Diagrams
  const sankeyDataBraBalconette = sankeyData.map(order => ({
    ...order,
    items: order.items.filter(item =>
      item.name.toLowerCase().includes("bra") || item.name.toLowerCase().includes("balconette")
    ),
  })).filter(order => order.items.length > 0); // Remove orders with no valid items

  const sankeyDataOther = sankeyData.map(order => ({
    ...order,
    items: order.items.filter(item =>
      !item.name.toLowerCase().includes("bra") && !item.name.toLowerCase().includes("balconette")
    ),
  })).filter(order => order.items.length > 0); // Remove orders with no valid items


  return (
    <div className="app-container">
      <StackedBars data={productData} />
      <LandingPagesLine data={landingPagesCn.filter((d) => d.cartAdditions > 100 && d.name != "/")}  containerId="chart-high"/>
      <LandingPagesLine data={landingPagesCn.filter((d) => d.cartAdditions < 100 && d.cartAdditions > 50)}  containerId="chart-mid"/>
      <LandingPagesLine data={landingPagesCn.filter((d) => d.cartAdditions < 50 && d.cartAdditions > 10)}  containerId="chart-low"/>
      <h1>Suspicious Orders Flow</h1>
      <CheaterScatterPlot data={sankeyData} width={1500} height={700} />
      <h1>Bralettes in Subscription</h1>
      <CheaterSankeyDiagram data={sankeyDataBraBalconette} pantyData={sankeyDataOther} width={1500} height={1000} isSet={true}/>
      <h1>Panties in Subscription</h1>
      <CheaterSankeyDiagram data={sankeyDataOther} pantyData={sankeyDataOther} width={1500} height={1000} isSet={false}/>
    </div>
  );
}

export default App;

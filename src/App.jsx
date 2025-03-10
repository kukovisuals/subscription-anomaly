import { fileOrders } from './utilities/allFiles';

import { useEffect, useState } from "react";
import { productSales } from './utilities/allDataObjects';

// import CheaterSankeyChart from "./components/CheaterSankeyChart";
import CheaterScatterPlot from './components/CheaterScatterPlot';
import CheaterHeatmap from './components/CheaterHeatmap';

function App() {
  const [sankeyData, setSankeyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const suspiciousOrders = await productSales(fileOrders); // Adjust based on how you fetch data
        setSankeyData(suspiciousOrders);
        console.log(suspiciousOrders)
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <div>Loading data...</div>;
  if (sankeyData.length === 0) return <div>No suspicious orders found!</div>;

  return (
    <div className="app-container">
      <h1>Suspicious Orders Flow</h1>
      <CheaterHeatmap data={sankeyData} width={1500} height={700} />
      <p>Our current average is sitting at 150 </p>
      <p>Blues are over 150</p>
      <p>oranges are under 150</p>
      <CheaterScatterPlot data={sankeyData} width={1500} height={700} />
    </div>
  );
}

export default App;

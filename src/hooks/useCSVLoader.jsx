import { useState, useEffect } from "react";
import { productSales } from "../utilities/allDataObjects";

/**
 * Custom hook to fetch and process CSV data
 * @param {Array} files - Array of file objects with {file, date}
 * @returns {Array} Processed CSV data
 */
export function useCSVLoader(files) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const processedData = await productSales(files);
        setData(processedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [files]);

  return { data, loading, error };
}

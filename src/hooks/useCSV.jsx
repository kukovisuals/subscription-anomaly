import { useState, useEffect } from 'react';
import * as d3 from 'd3';
import * as _ from 'lodash';

const useCSV = (csvFile) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    d3.csv(csvFile, d3.autoType).then((parsedData) => {
        const grouped = _.groupBy(parsedData, 'Contact');
      setData(grouped);
    });
  }, [csvFile]);

  return data;
};

export default useCSV;

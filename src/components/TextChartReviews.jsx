import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { timeParse, timeFormat } from "d3-time-format";

const issueMap = {
  quality: ['apart', 'tear', 'broken', 'rip', 'come', 'issue', 'cheap', 'wear', 'waste'],
  sizing: ['size', 'fit', 'sizing', 'tight', 'larger', 'smaller', 'too', 'rolls', 'correct', 'wrong'],
  support: ['support', 'hold', 'structure'],
  delivery: ['delivery', 'sent', 'emailed', 'choose', 'picked', 'reminding', 'didnt', 'switch', 'not', 'cancel', 'order'],
  customer_service: ['service', 'never', 'responded', 'answered', 'reached', 'no', 'reply', 'emailed', 'contacted', 'exchange'],
  price: ['price', 'expensive', 'money', 'cost', 'worth', 'overpriced', 'waste'],
  selection: ['choose', 'style', 'print', 'color', 'mesh', 'design', 'liked', 'solid', 'parameters', 'neutral', 'profile'],
  comfort: ['comfortable', 'soft', 'bliss', 'smooth', 'no', 'lines', 'feel', 'butter', 'velvet'],
  brand_love: ['love', 'favorite', 'great', 'best', 'happy', 'thankful', 'recommend', 'amazing', 'comfy', 'absolutely'],
  convenience: ['surprise', 'every', 'month', 'few', 'door', 'dont', 'go', 'shopping', 'automatically']
};

const parseDate = timeParse("%Y-%m-%d %H:%M:%S");
const formatWeek = timeFormat("%Y-%W");

function IssueBarChart({ data, width, height }) {
  const svgRef = useRef(null);
  const [weekIndex, setWeekIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const cumulativeCounts = useRef({});
  const allWeeks = Array.from(
    new Set(
      data
        .map(d => formatWeek(parseDate(d.created_at)))
        .filter(Boolean)
    )
  ).sort();

  useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    data.map( d => console.log(d.body))
    const svg = d3.select(svgRef.current);
    const margin = { top: 60, right: 40, bottom: 60, left: 160 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const allCategoryNames = Object.keys(issueMap);

    if (weekIndex === 0) {
      cumulativeCounts.current = {};
      allCategoryNames.forEach(cat => {
        cumulativeCounts.current[cat] = { pos: 0, neg: 0 };
      });
    }

    const currentWeek = allWeeks[weekIndex];
    const weekData = data.filter(d => formatWeek(parseDate(d.created_at)) === currentWeek);

    weekData.forEach(d => {
      const body = d.body || [];
      const sentiment = d.sentiment_score;

      for (const [category, keywords] of Object.entries(issueMap)) {
        const matched = keywords.some(keyword => body.includes(keyword));
        if (matched) {
          if (sentiment > 0.2) cumulativeCounts.current[category].pos++;
          else if (sentiment < -0.2) cumulativeCounts.current[category].neg++;
        }
      }
    });

    const chartData = allCategoryNames.map(category => ({
      category,
      ...cumulativeCounts.current[category]
    }));

    const x = d3.scaleLinear()
      .domain([0, Math.ceil(d3.max(chartData, d => Math.max(d.pos, d.neg)) || 1)])
      .range([0, innerWidth]);

    const y = d3.scaleBand()
      .domain(chartData.map(d => d.category))
      .range([0, innerHeight])
      .padding(0.3);

    const chart = svg.select("g.chart-group");

    if (chart.empty()) {
      svg.append("g").attr("class", "chart-group").attr("transform", `translate(${margin.left},${margin.top})`);
    }

    const chartGroup = svg.select(".chart-group");

    chartGroup.select(".x-axis")
      .transition()
      .duration(500)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")))
      .selectAll("text")
      .style("font-family", "Helvetica Neue")
      .style("fill", "#888")
      .style("font-size", "12px");

    if (weekIndex === 0) {
      chartGroup.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll("text")
        .style("font-family", "Helvetica Neue")
        .style("font-size", "14px")
        .style("fill", "#444");

      chartGroup.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${innerHeight})`);
    }

    chartGroup.selectAll(".bar-pos")
      .data(chartData, d => d.category)
      .join("rect")
      .attr("class", "bar-pos")
      .attr("x", x(0))
      .attr("y", d => y(d.category))
      .attr("height", y.bandwidth() / 2.5)
      .transition()
      .duration(500)
      .attr("width", d => x(d.pos))
      .attr("fill", "#2ecc71")
      .attr("rx", 4);

    chartGroup.selectAll(".bar-neg")
      .data(chartData, d => d.category)
      .join("rect")
      .attr("class", "bar-neg")
      .attr("x", x(0))
      .attr("y", d => y(d.category) + y.bandwidth() / 2)
      .attr("height", y.bandwidth() / 2.5)
      .transition()
      .duration(500)
      .attr("width", d => x(d.neg))
      .attr("fill", "#e74c3c")
      .attr("rx", 4);

    svg.selectAll(".week-label")
      .data([currentWeek])
      .join("text")
      .attr("class", "week-label")
      .attr("x", width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-family", "Helvetica Neue")
      .style("fill", "#222")
      .text(`Sentiment Trend – Week of ${currentWeek}`);
  }, [data, weekIndex, width, height]);

  useEffect(() => {
    if (!autoPlay) return;
    const allWeeks = Array.from(
      new Set(
        data
          .map(d => formatWeek(parseDate(d.created_at)))
          .filter(Boolean)
      )
    ).sort();
    const interval = setInterval(() => {
      setWeekIndex(prev => (prev + 1 < allWeeks.length ? prev + 1 : 0));
    }, 2500);
    return () => clearInterval(interval);
  }, [autoPlay, data]);

  return (
    <div>
      <svg ref={svgRef} width={width} height={height} style={{ background: "#f9f9f9", borderRadius: 12 }} />
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <input
          type="range"
          min={0}
          max={Array.from(
            new Set(
              data
                .map(d => formatWeek(parseDate(d.created_at)))
                .filter(Boolean)
            )
          ).sort().length - 1}
          value={weekIndex}
          onChange={e => {
            setWeekIndex(Number(e.target.value));
            setAutoPlay(false);
          }}
        />
        <button onClick={() => setAutoPlay(!autoPlay)} style={{ marginLeft: 10 }}>
          {autoPlay ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}

export default IssueBarChart;
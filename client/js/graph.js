
import * as d3 from "d3";

export class Graph {
  constructor( { selector, width, height } ) {
    this.selector = selector;
    this.width = width;
    this.height = height;
    this.root = d3.select(selector);
    this.tooltip = this.root
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "2px")
      .style("border-radius", "5px")
      .style("padding", "5px");
  }

  loadData(data) {
    this.data = data;
    this.render();
  }

  render() {

    this.clearGraph();

    console.log('Rendering...');

    this.svg = this.root.append('svg').attr("viewBox", [0, 0, this.width, this.height]);

    const margin = ({top: 20, right: 0, bottom: 30, left: 40});

    const xAxis = g => g
      .attr("transform", `translate(0,${ this.height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));
    
    const yAxis = g => g
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call(g => g.select(".domain").remove());
    
    
    const x = d3.scaleBand()
      .domain( this.data.map(d => d.label) )
      .range([margin.left, this.width - margin.right])
      .padding(0.1);
    
    const y = d3.scaleLinear()
      .domain([ 0, d3.max( this.data, d => d.value ) ]).nice()
      .range([ this.height - margin.bottom, margin.top]);
    
    // Three function that change the tooltip when user hover / move / leave a cell
    const thisTooltip = this.tooltip;
    const thisSelector = this.selector;
    const mouseover = function(_d) {
      thisTooltip.style("opacity", 1);
      d3.select(this)
        .style("stroke", "black")
        .style("opacity", 1);
    };
    const mousemove = function(d) {
      thisTooltip
        .html(`${d.label}: ${d.value} units`)
        .style("left", (d3.mouse(this)[0]) + "px")
        .style("top", thisSelector.offsetTop + (d3.mouse(this)[1]) + "px");
    };
    const mouseleave = function(_d) {
      thisTooltip.style("opacity", 0);
      d3.select(this)
        .style("stroke", "none")
        .style("opacity", 0.8);
    };

    const _bar = this.svg.append("g")
      .attr("fill", "steelblue")
      .selectAll("rect")
      .data( this.data )
      .join("rect")
      .style("mix-blend-mode", "multiply")
      .attr("x", d => x(d.label))
      .attr("y", d => y(d.value))
      .attr("height", d => y(0) - y(d.value))
      .attr("width", x.bandwidth())
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);
    
    const _gx = this.svg.append("g").attr("id", "xaxis")
      .call(xAxis);
    
    const _gy = this.svg.append("g")
      .call(yAxis);

    
  }

  clearGraph() {
    if( this.svg ) {
      console.log('Clearing old graph...');
      this.svg.remove();
    }
  }


  setHeight(height) {
    this.svg.attr("height", height);
  }

}
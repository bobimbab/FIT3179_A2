// Global variables
let choroplethMap = null;
let dotDistributionMap = null;
let choroplethLayer = null;
let dotMarkers = [];
let currentYear = 2023; // Set current year or adjust as necessary
let sheetColumns = [];
let sheetData = [];
let currentChartId = '';

// Function to handle Excel file upload and process the Excel file
function loadFile() {
    const fileInput = document.getElementById('file-input').files[0];
    if (!fileInput) {
        alert("Please select a file first!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Process only Sheet 2
        const sheet2 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]], { header: 1 });

        // Extract column names (header row) and data
        sheetColumns = sheet2[0];
        sheetData = sheet2.slice(1);

        // Process only Sheet 3
        const sheet3 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[2]], { header: 1 });

        // Extract column names (header row) and data
        sheetColumns = sheet3[0];
        sheetData3= sheet3.slice(1);


        // Initial visualization
        // showVisualization('choropleth-map'); // Start with Choropleth Map
    };
    reader.readAsArrayBuffer(fileInput);
}
// Function to show selected visualization
function showVisualization(chartId) {
    // Update current chart ID
    currentChartId = chartId;

    // Hide all visualizations
    document.querySelectorAll('.visualization').forEach(el => {
        el.style.display = 'none';
    });

    // Show selected visualization
    const selectedChart = document.getElementById(chartId);
    if (selectedChart) {
        selectedChart.style.display = 'block';
    }

    // Update the selected visualization
    updateVisualization(chartId);
}

// Function to update visualization based on current year and data
function updateVisualization(chartId) {
    if (!sheetData || !sheetColumns) return;

    switch (chartId) {
        case 'bubble-chart':
            createBubbleChart();
            break;
        case 'stacked-area-chart':
            createStackedAreaChart();
            break;
        case 'choropleth-map':
            createChoroplethMap();
            break;
        case 'dot-distribution-map':
            createDotDistributionMap();
            break;
        case 'sankey-diagram':
            createSankeyDiagram();
            break;
    }
}

// Update year display
function updateYearDisplay() {
    const yearDisplay = document.getElementById('year-display');
    if (yearDisplay) {
        yearDisplay.innerText = `Selected Year: ${currentYear}`;
    }

    // Recreate maps with new year data
    if (document.getElementById('choropleth-map').style.display === 'block') {
        createChoroplethMap(); // Update choropleth map with new year data
    }

    if (document.getElementById('dot-distribution-map').style.display === 'block') {
        createDotDistributionMap(); // Update dot distribution map with new year data
    }
}


function initializeMaps(mapType) {
    // Initialize or destroy Choropleth Map based on the selected map
    if (mapType === 'choropleth') {
        if (!choroplethMap) {
            choroplethMap = L.map('choropleth-map').setView([4.2105, 108.9758], 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(choroplethMap);
        } else {
            choroplethMap.invalidateSize();  // Fix rendering issue when map is shown
        }
    } else if (choroplethMap) {
        choroplethMap.remove(); // Destroy Choropleth Map when switching
        choroplethMap = null;
    }

    // Initialize or destroy Dot Distribution Map based on the selected map
    if (mapType === 'dotDistribution') {
        if (!dotDistributionMap) {
            dotDistributionMap = L.map('dot-distribution-map').setView([4.2105, 108.9758], 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(dotDistributionMap);
        } else {
            dotDistributionMap.invalidateSize();  // Fix rendering issue when map is shown
        }
    } else if (dotDistributionMap) {
        dotDistributionMap.remove();  // Destroy Dot Distribution Map when switching
        dotDistributionMap = null;
    }
}


function showChoroplethMap() {
    document.getElementById('choropleth-map').style.display = 'block';
    document.getElementById('dot-distribution-map').style.display = 'none';
    document.getElementById('bubble-chart').style.display = 'none';
    document.getElementById('stacked-area-chart').style.display = 'none';
    document.getElementById('sankey-diagram').style.display = 'none';

    initializeMaps('choropleth');
    createChoroplethMap();
}

function showDotDistributionMap() {
    document.getElementById('dot-distribution-map').style.display = 'block';
    document.getElementById('choropleth-map').style.display = 'none';
    document.getElementById('bubble-chart').style.display = 'none';
    document.getElementById('stacked-area-chart').style.display = 'none';
    document.getElementById('sankey-diagram').style.display = 'none';

    initializeMaps('dotDistribution');
    createDotDistributionMap();
}


// createChoroplethMap function
function createChoroplethMap() {
    if (!choroplethMap) {
        initializeMaps();
    }

    if (choroplethLayer) {
        choroplethMap.removeLayer(choroplethLayer);
    }

    fetch('data/states-topo.json')
        .then(response => response.json())
        .then(topoData => {
            const geoData = topojson.feature(topoData, topoData.objects.layer1);

            function styleFeature(feature) {
                const stateName = feature.properties.Name;
                const dataRow = sheetData.find(row =>
                    row[sheetColumns.indexOf("subnational1")] === stateName);
                const value = dataRow ?
                    parseFloat(dataRow[sheetColumns.indexOf(`tc_loss_ha_${currentYear}`)]) : 0;

                return {
                    fillColor: getColor(value),
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            }

            function getColor(d) {
                return d > 10000 ? '#800026' :
                    d > 5000 ? '#BD0026' :
                        d > 2000 ? '#E31A1C' :
                            d > 1000 ? '#FC4E2A' :
                                d > 500 ? '#FD8D3C' :
                                    d > 200 ? '#FEB24C' :
                                        d > 100 ? '#FED976' :
                                            '#FFEDA0';
            }

            choroplethLayer = L.geoJson(geoData, {
                style: styleFeature,
                onEachFeature: function (feature, layer) {
                    const stateName = feature.properties.Name;
                    const dataRow = sheetData.find(row =>
                        row[sheetColumns.indexOf("subnational1")] === stateName);
                    const value = dataRow ?
                        parseFloat(dataRow[sheetColumns.indexOf(`tc_loss_ha_${currentYear}`)]) : 0;

                    layer.bindPopup(`
                        <strong>${stateName}</strong><br>
                        Deforestation: ${value.toLocaleString()} hectares
                    `);
                }
            }).addTo(choroplethMap);

            choroplethMap.fitBounds(choroplethLayer.getBounds());
        })
        .catch(error => console.error('Error loading topology data:', error));
}

// Create Dot Distribution Map with Size Based on Hectare Loss
function createDotDistributionMap() {
    if (!dotDistributionMap) {
        initializeMaps();
    }

    // Clear existing markers
    dotMarkers.forEach(marker => dotDistributionMap.removeLayer(marker));
    dotMarkers = [];

    fetch('data/states-topo.json')
        .then(response => response.json())
        .then(topoData => {
            const geoData = topojson.feature(topoData, topoData.objects.layer1);
            
            // Process data by subnational2 areas
            const subnational1Index = sheetColumns.indexOf("subnational1");
            const subnational2Index = sheetColumns.indexOf("subnational2");
            const tcLossIndex = sheetColumns.indexOf(`tc_loss_ha_${currentYear}`);

            // Group data by subnational1 and subnational2
            const combinedData = {};

            sheetData3.forEach(row => {
                const stateName = row[subnational1Index];
                const areaName = row[subnational2Index];
                const deforestationValue = parseFloat(row[tcLossIndex]) || 0;

                const key = `${stateName}|${areaName}`; // Create a unique key for combination

                if (!combinedData[key]) {
                    combinedData[key] = {
                        stateName,
                        areaName,
                        totalDeforestation: 0,
                    };
                }
                combinedData[key].totalDeforestation += deforestationValue; // Aggregate values
            });

            // Group features by state for easy access
            const stateFeatures = new Map();
            geoData.features.forEach(feature => {
                stateFeatures.set(feature.properties.Name, feature);
            });

            // Create markers for the aggregated data
            Object.values(combinedData).forEach(data => {
                const { stateName, areaName, totalDeforestation } = data;

                if (totalDeforestation > 0 && stateFeatures.has(stateName)) {
                    const stateFeature = stateFeatures.get(stateName);
                    
                    // Generate a position within the state boundaries
                    const point = randomPointInPolygon(stateFeature);
                    
                    if (point) {
                        // Calculate dot size based on total deforestation value
                        const dotSize = Math.sqrt(totalDeforestation) / 10; // Adjust scaling factor as needed

                        const marker = L.circleMarker([point[1], point[0]], {
                            radius: dotSize,  // Use dynamic size based on total deforestation value
                            fillColor: "#ff0000",
                            color: "#000",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).addTo(dotDistributionMap);

                        marker.bindPopup(`
                            <strong>${stateName} - ${areaName}</strong><br>
                            Deforestation: ${totalDeforestation.toLocaleString()} hectares
                        `);

                        dotMarkers.push(marker);
                    }
                }
            });

            // Fit bounds to all markers
            if (dotMarkers.length > 0) {
                const group = L.featureGroup(dotMarkers);
                dotDistributionMap.fitBounds(group.getBounds());
            }

            // Add or update legend
            addSimpleLegend(dotDistributionMap);
        })
        .catch(error => console.error('Error loading topology data:', error));
}


// Add a legend to the maps (for uniform dot size)
function addSimpleLegend(map) {
    // Remove existing legend if any
    if (map.legendControl) {
        map.removeControl(map.legendControl);
    }

    // Create new legend control
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');

        div.innerHTML = `
            <h4>Deforestation Indicators</h4>
            <i class="circle" style="width: 10px; height: 10px;"></i> 
            Each dot represents an area with deforestation<br>
            <small>Hover over dots to see detailed values</small>
        `;

        return div;
    };

    // Save legend reference to the map so it can be removed later
    map.legendControl = legend;

    legend.addTo(map);
}

function randomPointInPolygon(feature) {
    const bbox = turf.bbox(feature);
    let point;
    let pointInPoly = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!pointInPoly && attempts < maxAttempts) {
        const lon = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
        const lat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
        point = turf.point([lon, lat]);

        if (turf.booleanPointInPolygon(point, feature)) {
            pointInPoly = true;
            return point.geometry.coordinates;
        }
        attempts++;
    }


    if (!pointInPoly) {
        const centroid = turf.centroid(feature);
        return centroid.geometry.coordinates;
    }
}

// Add a legend to the maps
function addLegend(map, type) {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');

        if (type === 'choropleth') {
            const grades = [0, 100, 200, 500, 1000, 2000, 5000, 10000];
            const colors = ['#FFEDA0', '#FED976', '#FEB24C', '#FD8D3C',
                '#FC4E2A', '#E31A1C', '#BD0026', '#800026'];

            div.innerHTML += '<h4>Deforestation (ha)</h4>';

            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + colors[i] + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
            }
        } else if (type === 'dot') {
            const sizes = [100, 1000, 5000, 10000];

            div.innerHTML += '<h4>Deforestation (ha)</h4>';

            for (let size of sizes) {
                div.innerHTML +=
                    '<i class="circle" style="width: ' + (Math.sqrt(size) / 5) +
                    'px; height: ' + (Math.sqrt(size) / 5) + 'px;"></i> ' +
                    size + '<br>';
            }
        }

        return div;
    };


    legend.addTo(map);
}

const coordinates = {
    "Johor": { latitude: 1.4854, longitude: 103.7618 },
    "Kedah": { latitude: 6.1184, longitude: 100.3681 },
    "Kelantan": { latitude: 6.1254, longitude: 102.2381 },
    "Kuala Lumpur": { latitude: 3.1390, longitude: 101.6869 },
    "Melaka": { latitude: 2.1896, longitude: 102.2501 },
    "Negeri Sembilan": { latitude: 2.7252, longitude: 101.9424 },
    "Pahang": { latitude: 3.8126, longitude: 103.3256 },
    "Penang": { latitude: 5.4164, longitude: 100.3327 },
    "Perak": { latitude: 4.5975, longitude: 101.0901 },
    "Perlis": { latitude: 6.4408, longitude: 100.1983 },
    "Selangor": { latitude: 3.0738, longitude: 101.5183 },
    "Terengganu": { latitude: 5.3117, longitude: 103.1324 },
    "Sabah": { latitude: 5.9788, longitude: 116.0753 },
    "Sarawak": { latitude: 1.5533, longitude: 110.3592 }
};


// Function to process data and aggregate by subnational and year
function aggregateDataBySubnationalAndYear(sheetData, sheetColumns, currentYear) {
    const aggregatedData = {};

    // Iterate through each row and aggregate tc_loss by subnational for the current year
    sheetData.forEach(row => {
        const subnational = row[sheetColumns.indexOf("subnational1")];
        const tc_loss = row[sheetColumns.indexOf(`tc_loss_ha_${currentYear}`)];

        // Check if subnational exists in the aggregatedData object
        if (!aggregatedData[subnational]) {
            aggregatedData[subnational] = {
                subnational: subnational,
                tc_loss: 0, // Initialize the cumulative tc_loss
                latitude: Math.random() * 180 - 90,  // Random latitude for demo
                longitude: Math.random() * 360 - 180 // Random longitude for demo
            };
        }

        // Sum tc_loss for the same subnational
        aggregatedData[subnational].tc_loss += tc_loss;
    });

    // Convert the aggregated data object back to an array
    return Object.values(aggregatedData);
}

function createBubbleChart() {
    vegaEmbed('#bubble-chart', {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 800, // Set a larger width
        "height": 600, // Set a larger height
        "data": {
            "values": sheetData.map(row => {
                const subnational = row[sheetColumns.indexOf("subnational1")];
                const coords = coordinates[subnational] || { latitude: 0, longitude: 0 }; // Use real latitude and longitude
                return {
                    "subnational": subnational,
                    "tc_loss": row[sheetColumns.indexOf(`tc_loss_ha_${currentYear}`)],
                    "latitude": coords.latitude,
                    "longitude": coords.longitude
                };
            })
        },
        "mark": "circle",
        "encoding": {
            "x": {
                "field": "longitude",
                "type": "quantitative",  // X-axis based on longitude
                "axis": { "title": "Longitude", "grid": true }  // Enable grid lines
            },
            "y": {
                "field": "latitude",
                "type": "quantitative",  // Y-axis based on latitude
                "axis": { "title": "Latitude", "grid": true }  // Enable grid lines
            },
            "size": {
                "field": "tc_loss",
                "type": "quantitative",
                "scale": { "range": [50, 2000] },  // Bubble size range based on tree cover loss
                "legend": { "title": "Tree Cover Loss (ha)" }  // Size legend for tc_loss
            },
            "color": {
                "field": "subnational",
                "type": "nominal",
                "legend": { "title": "State / Subnational" }  // Color coding by state
            },
            "tooltip": [
                { "field": "subnational", "type": "nominal", "title": "State" },
                { "field": "tc_loss", "type": "quantitative", "title": "Tree Cover Loss (ha)" },
                { "field": "latitude", "type": "quantitative", "title": "Latitude" },
                { "field": "longitude", "type": "quantitative", "title": "Longitude" }
            ]
        }
    });
}


// Create Stacked Area Chart with Thin and Wide Frame
function createStackedAreaChart() {
    const yearColumns = sheetColumns.filter(col => col.startsWith("tc_loss_ha_"));
    const stackData = [];

    sheetData.forEach(row => {
        yearColumns.forEach((yearCol) => {
            stackData.push({
                "subnational": row[sheetColumns.indexOf("subnational1")],
                "year": yearCol.replace("tc_loss_ha_", ""),  // Extract year
                "tc_loss_ha": row[sheetColumns.indexOf(yearCol)]
            });
        });
    });

    vegaEmbed('#stacked-area-chart', {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 1200,  // Set a wider frame
        "height": 400,  // Set a thinner frame
        "data": {
            "values": stackData
        },
        "mark": "area",
        "encoding": {
            "x": {
                "field": "year",
                "title": "Year"
            },
            "y": {
                "field": "tc_loss_ha",
                "type": "quantitative",
                "stack": "normalize",
                "title": "Tree Cover Loss (ha)"
            },
            "color": {
                "field": "subnational",
                "type": "nominal",
                "legend": { "title": "State / Subnational" }
            },
            "tooltip": [
                { "field": "year", "title": "Year" },
                { "field": "tc_loss_ha", "title": "Tree Cover Loss (ha)" },
                { "field": "subnational", "title": "State" }
            ]
        }
    });
}

// Create Interactive Sankey Diagram
function createSankeyDiagram() {
    if (!sheetData || !sheetColumns) {
        console.error("Sheet data or columns are not available");
        return;
    }

    // Process data for Sankey diagram
    const sankeyData = {
        nodes: [],
        links: []
    };

    const subnationalIndex = sheetColumns.indexOf("subnational1");
    const tcLossIndex = sheetColumns.indexOf(`tc_loss_ha_${currentYear}`);

    if (subnationalIndex === -1 || tcLossIndex === -1) {
        console.error("Required columns not found in the data");
        return;
    }

    // Create nodes for subnational regions
    const subnationalSet = new Set();
    let nodeIndex = 0;
    const nodeMap = new Map();

    // First pass: collect all subnational regions
    sheetData.forEach(row => {
        const subnational = row[subnationalIndex];
        if (subnational && !nodeMap.has(subnational)) {
            nodeMap.set(subnational, nodeIndex++);
            subnationalSet.add(subnational);
        }
    });

    // Create nodes array
    nodeMap.forEach((index, name) => {
        sankeyData.nodes.push({ id: index, name: name });
    });

    // Add a target node for "Hectar Loss"
    sankeyData.nodes.push({ id: nodeIndex, name: "Hectar Loss" });

    // Create links
    sheetData.forEach(row => {
        const subnational = row[subnationalIndex];
        const tcLoss = parseFloat(row[tcLossIndex]);

        if (subnational && !isNaN(tcLoss)) {
            const sourceIndex = nodeMap.get(subnational);

            // Using the actual tcLoss as the target value
            sankeyData.links.push({
                source: sourceIndex,
                target: nodeIndex, // This will refer to the link target
                value: tcLoss
            });
        }
    });

    // Set up SVG
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const width = 1200 - margin.left - margin.right; // Increased width
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#sankey-diagram")
        .html("") // Clear previous content
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const x = d3.scaleLinear().range([0, width]);
    const y = d3.scalePoint().range([0, height]).padding(0.5);

    // Set up node positions
    const nodeWidth = 15;
    sankeyData.nodes.forEach(node => {
        node.x = node.name === "Hectar Loss" ? width / 2 - nodeWidth / 2 : 0; // Center Hectar Loss
        node.dx = nodeWidth;
    });

    y.domain(sankeyData.nodes.map(d => d.id));
    sankeyData.nodes.forEach(node => {
        node.y = y(node.id);
    });

    // Create a color scale based on the value of the links
    const color = d3.scaleSequential(d3.interpolateRdYlBu)
        .domain([0, d3.max(sankeyData.links, d => d.value)]);

    // Create drag behavior for the "Hectar Loss" node
    const drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    // Draw links
    const link = svg.append("g")
        .selectAll(".link")
        .data(sankeyData.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", linkPath)
        .attr("fill", "none")
        .attr("stroke", d => color(d.value)) // Set the link color based on value
        .attr("stroke-opacity", 0.8)
        .attr("stroke-width", d => Math.max(1, Math.sqrt(d.value) / 10))
        .on("mouseover", highlightLink) // Attach mouseover event
        .on("mouseout", unhighlightLink); // Attach mouseout event

    // Draw nodes
    const node = svg.append("g")
        .selectAll(".node")
        .data(sankeyData.nodes)
        .enter().append("rect")
        .attr("class", "node")
        .attr("x", d => d.x)
        .attr("y", d => d.y - 5)
        .attr("height", 10)
        .attr("width", nodeWidth)
        .attr("fill", d => d.name === "Hectar Loss" ? "#d9534f" : color(d.name)) // Different color for Hectar Loss
        .call(drag); // Make Hectar Loss draggable

    // Add labels
    const label = svg.append("g")
        .selectAll(".label")
        .data(sankeyData.nodes)
        .enter().append("text")
        .attr("class", "label")
        .attr("x", d => d.x < width / 2 ? d.x + nodeWidth + 6 : d.x - 6)
        .attr("y", d => d.y)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x < width / 2 ? "start" : "end")
        .text(d => d.name)
        .style("font-size", "10px");

    // Add tooltips
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px");

    // Hover effects
    node.on("mouseover", highlightNode)
        .on("mouseout", unhighlightNode);

    // Helper functions
    function linkPath(d) {
        return d3.linkHorizontal()({
            source: [sankeyData.nodes[d.source].x + nodeWidth, sankeyData.nodes[d.source].y],
            target: [sankeyData.nodes[d.target].x, sankeyData.nodes[d.target].y]
        });
    }

    function dragstarted(event, d) {
        d3.select(this).raise().attr("stroke", "black");
    }

    function dragged(event, d) {
        // Allow dragging of the "Hectar Loss" node
        if (d.name === "Hectar Loss") {
            d.y = Math.max(0, Math.min(height, event.y)); // Keep within SVG boundaries
            d3.select(this).attr("y", d.y - 5);
            link.attr("d", linkPath); // Update link positions
            label.filter(p => p === d).attr("y", d.y);
        }
    }

    function dragended(event, d) {
        d3.select(this).attr("stroke", null);
    }

    function highlightNode(event, d) {
        const connectedLinks = sankeyData.links.filter(l => l.source === d.id || l.target === d.id);
        const connectedNodes = new Set(connectedLinks.flatMap(l => [l.source, l.target]));

        node.style("opacity", n => connectedNodes.has(n.id) ? 1 : 0.1);
        link.style("opacity", l => l.source === d.id || l.target === d.id ? 1 : 0.1);
        label.style("opacity", n => connectedNodes.has(n.id) ? 1 : 0.1);

        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html(`<strong>${d.name}</strong><br/>Total Loss: ${d3.sum(connectedLinks, l => l.value).toLocaleString()} ha`)
            .style("left", (event.pageX + 10) + "px") // Offset tooltip slightly
            .style("top", (event.pageY - 28) + "px");
    }

    function unhighlightNode() {
        node.style("opacity", 1);
        link.style("opacity", 0.8);
        label.style("opacity", 1);
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    }

    function highlightLink(event, d) {
        node.style("opacity", n => n.id === d.source || n.id === d.target ? 1 : 0.1);
        link.style("opacity", l => l === d ? 1 : 0.5); // Slightly dim others
        label.style("opacity", n => n.id === d.source || n.id === d.target ? 1 : 0.1);

        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html(`<strong>${sankeyData.nodes[d.source].name}</strong> to <strong>${sankeyData.nodes[d.target].name}</strong><br/>Loss: ${d.value.toLocaleString()} ha`)
            .style("left", (event.pageX + 10) + "px") // Slightly offset the tooltip from cursor
            .style("top", (event.pageY - 28) + "px");
    }

    function unhighlightLink() {
        node.style("opacity", 1);
        link.style("opacity", 0.8);
        label.style("opacity", 1);
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    }
}


// Event listener for file upload
document.getElementById('file-input').addEventListener('change', loadFile);

// // Event listener for year selection
// document.querySelectorAll('input[name="year"]').forEach(input => {
//     input.addEventListener('change', (event) => {
//         currentYear = parseInt(event.target.value);
//         updateYearDisplay();
//         updateVisualization('choropleth-map');
//         updateVisualization('dot-distribution-map');
//     });
// });

document.getElementById('year-slider').addEventListener('input', (event) => {
    currentYear = parseInt(event.target.value);
    updateYearDisplay();
    updateVisualization(currentChartId);  // Ensure the chart updates with the new year
});



// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
    const buttons = {
        'show-bubble-chart': 'bubble-chart',
        'show-stacked-area-chart': 'stacked-area-chart',
        'show-choropleth-map': 'choropleth-map',
        'show-dot-distribution-map': 'dot-distribution-map',
        'show-sankey-diagram': 'sankey-diagram'
    };

    Object.entries(buttons).forEach(([buttonId, chartId]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => showVisualization(chartId));
        }
    });
});


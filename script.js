// Global variables
let choroplethMap = null;
let dotDistributionMap = null;
let choroplethLayer = null;
let dotMarkers = [];
let currentYear = 2001; // Set current year or adjust as necessary
let sheetColumns3 = [];
let sheetColumns5 = [];
let sheetData5 = [];
let sheetData3 = [];
let currentChartId = '';
let randomPointCache = {}; // Cache for random points in polygons

const startYear = 2000; // Define the starting year
const endYear = 2023;   // Define the ending year

// Global variables to hold the loaded sheet data
let sheet1, sheet2, sheet3, sheet4, sheet5, sheet6, sheet7;


// Function to load and process the Excel file
function loadFile() {
    return fetch('source/MYS.xlsx')  // Return the fetch promise
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.arrayBuffer(); // Convert to ArrayBuffer
        })
        .then(data => {
            const workbook = XLSX.read(data, { type: "array" });


            // Process Sheet 1 (Country tree cover loss)
            sheet1 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            //console.log("Sheet 1 Data (Country Tree Loss):", sheet1);

            // Process Sheet 2 (Country carbon data)
            sheet2 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[1]], { header: 1 });
            // console.log("Sheet 2 Data (Country Carbon):", sheet2);

            // Process Sheet 3 (Subnational 1 tree cover loss)
            sheet3 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[2]], { header: 1 });
            sheetData3 = sheet3; // Set global sheetData to Sheet 5 data
            sheetColumns3 = sheetData3[0];
            // console.log("Sheet 3 Data (Subnational 1 Tree Loss):", sheet3);

            // Process Sheet 4 (Subnational 1 carbon data)
            sheet4 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[3]], { header: 1 });
            //console.log("Sheet 4 Data (Subnational 1 Carbon):", sheet4);

            // Process Sheet 5 (Subnational 2 tree cover loss)
            sheet5 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[4]], { header: 1 });
            sheetData5 = sheet5; // Set global sheetData to Sheet 5 data
            sheetColumns5 = sheetData5[0]; // Use the first row as column headers
           // console.log("Sheet 5 Data (Subnational 2 Tree Loss):", sheet5);

            // Process Sheet 6 (Subnational 2 carbon data)
            sheet6 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[5]], { header: 1 });
           // console.log("Sheet 6 Data (Subnational 2 Carbon):", sheet6);

            // Process Sheet 7 (Tree loss cause)
            sheet7 = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[6]], { header: 1 });
          //  console.log("Sheet 7 Data (Tree Loss Causes):", sheet7); // Corrected log message

            console.log("Sheet 1 Data:", sheet1);
            console.log("Sheet 2 Data:", sheet2);
            console.log("Sheet 3 Data:", sheet3);
            console.log("Sheet 4 Data:", sheet4);
            console.log("Sheet 5 Data:", sheet5);
            console.log("Sheet 6 Data:", sheet6);
            console.log("Sheet 7 Data:", sheet7);

        })
        .catch(error => console.error("Error loading file:", error));
}

function getYearColumnIndex(selectedYear) {
    const columnName = `tc_loss_ha_${selectedYear}`.trim(); // Trim any spaces
    const normalizedColumns = sheetColumns3.map(col => col.trim()); // Normalize the sheet columns
    const index = normalizedColumns.indexOf(columnName);
    console.log(`Index for ${columnName}: ${index}`); // Log to see the index found
    return index; // This returns the index of the column
}

// Update year display
function updateYearDisplay() {
    const yearDisplay = document.getElementById('year-display');
    if (yearDisplay) {
        yearDisplay.innerText = `Selected Year: ${currentYear}`;
    }

    // Recreate maps with new year data
    if (document.getElementById('choropleth-map').style.display === 'block') {
        // createChoroplethMap(currentYear); // Uncomment if needed
    }

    if (document.getElementById('dot-distribution-map').style.display === 'block') {
        createDotDistributionMap(currentYear); // Pass the currentYear to the function
    }
}

function initializeMaps(mapType) {
    if (mapType === 'choropleth') {
        if (!choroplethMap) {
            choroplethMap = L.map('choropleth-map').setView([4.2105, 108.9758], 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(choroplethMap);
        } else {
            choroplethMap.invalidateSize();
        }
    } else if (mapType === 'dotDistribution') {
        if (!dotDistributionMap) {
            dotDistributionMap = L.map('dot-distribution-map').setView([4.2105, 108.9758], 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(dotDistributionMap);
        } else {
            dotDistributionMap.invalidateSize();
        }
    }
}


// Create BubbleChart
function createBubbleChart() { 
    
    const sheet7Headers = sheet7[0];
    const driverIndex = sheet7Headers.findIndex(header => header.includes('driver'));
    const yearIndex = sheet7Headers.findIndex(header => header.includes('year'));
    const subnationalIndex = sheet7Headers.findIndex(header => header.includes('subnational'));
    const lossAreaIndex = sheet7Headers.findIndex(header => header.includes('ha'));

    // Create merged data array
    const mergedData = [];

    // Process sheet7 to get all causes for each subnational region
    for (let i = 1; i < sheet7.length; i++) {
        const row = sheet7[i];
        const year = row[yearIndex];
        const subnational = row[subnationalIndex];
        const cause = row[driverIndex] || 'Unknown'; // Handle unknown causes
        const lossArea = parseFloat(row[lossAreaIndex]) || 0;

        // Filter for the current year
        if (subnational && year && year == currentYear) {
            mergedData.push({
                subnational: subnational,
                tc_loss: lossArea,
                cause: cause
            });
        }
    }

    // Process sheet3 to ensure we are capturing the total loss per region
    const sheet3Headers = sheet3[0];
    const yearColumnIndex = currentYear - 2001 + 2; // Adjust based on your data structure

    for (let i = 1; i < sheet3.length; i++) {
        const row = sheet3[i];
        const subnational = row[1];
        const tc_loss = parseFloat(row[yearColumnIndex]);

        // Check if this subnational already has a cause entry in mergedData
        const existingEntry = mergedData.find(d => d.subnational === subnational);

        // If the entry exists, aggregate the loss; if not, add it as 'Unknown'
        if (existingEntry) {
            existingEntry.tc_loss += tc_loss; // Aggregate tree cover loss
        } else if (tc_loss > 0) {
            mergedData.push({
                subnational: subnational,
                tc_loss: tc_loss,
                cause: 'Unknown' // Default cause if none exists
            });
        }
    }

    // Log mergedData to check if causes are correctly being captured
    console.log("Merged Data for Bubble Chart:", mergedData);

    // Create the bubble chart using Vega-Lite
    vegaEmbed('#bubble-chart', {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 1200,
        "height": 600,
        "data": {
            "values": mergedData
        },
        "mark": {
            "type": "circle",
            "tooltip": true,
            "size": 1000
        },
        "autosize": {
        "type": "fit",
        "contains": "padding"
        },
        "encoding": {
            "x": {
                "field": "subnational",
                "type": "nominal",
                "axis": {
                    "title": "Region / Subnational",
                    "grid": false,
                    "labelAngle": -45
                }
            },
            "y": {
                "field": "tc_loss", // Adjust to use rate_of_deforestation if calculated
                "type": "quantitative",
                "axis": { "title": "Tree Cover Loss (ha/year)", "grid": true }
            },
            "size": {
                "field": "tc_loss",
                "type": "quantitative",
                "scale": { "range": [50, 2000] }, // Adjust size range as needed
                "legend": { "title": "Tree Cover Loss (ha)" }
            },
            "color": {
                "field": "cause",
                "type": "nominal",
                "legend": { "title": "Cause of Deforestation" },
                "scale": {
                    "domain": [
                        "Commodity driven deforestation",
                        "Shifting agriculture",
                        "Forestry",
                        "Wildfire",
                        "Urbanization",
                        "Unknown"
                    ],
                    "range": [
                        "#ff9999", // Commodity driven deforestation
                        "#66b3ff", // Shifting agriculture
                        "#99ff99", // Forestry
                        "#ffcc99", // Wildfire
                        "#ff99cc", // Urbanization
                        "#cccccc"  // Unknown
                    ]
                }
            },
            "tooltip": [
                { "field": "subnational", "type": "nominal", "title": "Region / Subnational" },
                { "field": "tc_loss", "type": "quantitative", "title": "Tree Cover Loss (ha)", "format": ".2f" },
                { "field": "cause", "type": "nominal", "title": "Cause" }
            ]
        }
    }).catch(console.error);
}


function  createLineChart() {
    // Check if required sheets are loaded
    if (!sheet3 || !sheet7) {
        console.error("Required sheets are not loaded yet");
        return;
    }

    // Log sample data from both sheets for debugging
    console.log("Sheet 3 data sample:", sheet3.slice(0, 5));
    console.log("Sheet 7 data sample:", sheet7.slice(0, 5));

    const causesData = {};

    // Process Sheet 3 - Tree cover loss by subnational area
    for (let i = 1; i < sheet3.length; i++) {
        const row = sheet3[i];
        if (!row || row.length < 2) continue;

        const state = row[1];
        if (!state) continue;

        for (let year = 2001; year <= 2023; year++) {
            const columnIndex = year - 2001 + 2; // Adjusting index based on year
            const treeLossHa = parseFloat(row[columnIndex]);

            if (isNaN(treeLossHa)) continue;

            if (!causesData[year]) {
                causesData[year] = {};
            }
            if (!causesData[year][state]) {
                causesData[year][state] = {
                    totalLoss: 0,
                    causes: {}
                };
            }

            // Accumulate total loss per state and year
            causesData[year][state].totalLoss += treeLossHa;
        }
    }

    // Log intermediate state data
    console.log("Processed causesData:", JSON.stringify(causesData, null, 2));

    // Process Sheet 7 - Tree loss causes
    const sheet7Headers = sheet7[0];
    const yearIndex = sheet7Headers.findIndex(header => header.includes('year'));
    const driverIndex = sheet7Headers.findIndex(header => header.includes('driver'));
    const lossIndex = sheet7Headers.findIndex(header => header.includes('ha'));

    console.log("Sheet 7 column indices - Year:", yearIndex, "Driver:", driverIndex, "Loss:", lossIndex);

    // Process each row in Sheet 7
    for (let i = 1; i < sheet7.length; i++) {
        const row = sheet7[i];
        if (!row || row.length <= Math.max(yearIndex, driverIndex, lossIndex)) continue;

        const year = parseInt(row[yearIndex]);
        const cause = row[driverIndex];
        const lossHa = parseFloat(row[lossIndex]);

        if (isNaN(year) || !cause || isNaN(lossHa) || !causesData[year]) continue;

        // Distribute the loss across all states
        Object.keys(causesData[year]).forEach(state => {
            if (!causesData[year][state].causes[cause]) {
                causesData[year][state].causes[cause] = 0;
            }

            // Calculate total loss for the year across all states
            const totalYearLoss = Object.values(causesData[year])
                .reduce((sum, stateData) => sum + stateData.totalLoss, 0);

            if (totalYearLoss > 0) {
                // Proportionally distribute the loss based on each state's total loss
                const proportionOfTotalLoss = causesData[year][state].totalLoss / totalYearLoss;
                causesData[year][state].causes[cause] += lossHa * proportionOfTotalLoss;
            }
        });
    }

    // Convert causesData into lineData
    const lineData = [];
    const statesInLineData = new Set();

    Object.entries(causesData).forEach(([year, yearData]) => {
        Object.entries(yearData).forEach(([state, stateData]) => {
            Object.entries(stateData.causes).forEach(([cause, tcLossHa]) => {
                if (tcLossHa > 0) {
                    lineData.push({
                        year: parseInt(year),
                        subnational: state,
                        cause: cause,
                        tc_loss_ha: tcLossHa
                    });
                    statesInLineData.add(state);
                }
            });
        });
    });

    // Log final line data for debugging
    console.log("Final lineData:", JSON.stringify(lineData, null, 2));
    console.log("States in final line data:", Array.from(statesInLineData));
    console.log("Total number of data points:", lineData.length);

    // Check if there's any data to render
    if (lineData.length === 0) {
        console.warn("No data available for the line chart.");
        return;
    }

    // Updated chart configuration with new styling
    vegaEmbed('#line-chart', {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": 1200,
        "height": 400,
        "data": {
            "values": lineData
        },
        "height": 600,
        "mark": {
            "type": "line", // Changed from "area" to "line"
            "point": {"filled": true, "size": 40},  // Optional: add points to the line chart
            "strokeWidth": {"color": "black", "size": 1} // Make the line bold
        },
        "autosize": {
            "type": "fit",  // Make it responsive to the container
            "contains": "padding"
        },
        "encoding": {
            "x": {
                "field": "year",
                "type": "ordinal",
                "title": null  // Remove axis title
            },
            "y": {
                "field": "tc_loss_ha",
                "type": "quantitative",
                "title": "Tree Cover Loss (ha)",  // Remove axis title
                "axis": { "grid": false }  // Remove grid lines
            },
            "color": {
                "field": "subnational",
                "type": "nominal",
                "scale": {
                    "range": [
                        "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", 
                        "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#9edae5", "#ffbb78", 
                        "#98df8a", "#c49c94", "#f7b6d2", "#dbdb8d"
                    ]
                },
                "legend": {
                    "title": null,
                    "orient": "top-right",
                    "anchor": "end"
                }
            },
            "tooltip": [
                { "field": "year", "title": "Year" },
                { "field": "tc_loss_ha", "title": "Tree Cover Loss (ha)", "format": ".2f" },
                { "field": "subnational", "title": "State" },
                { "field": "cause", "title": "Cause of Loss" }  // Add cause to tooltip
            ]
        },
        "config": {
            "view": { "stroke": null },  // Remove chart border
            "axis": {
                "labelFont": "Arial",
                "labelFontSize": 12
            }
        }
    }).catch(console.error);
}


function createSankeyDiagram() {
    console.log("Starting createSankeyDiagram function");

    // Ensure data is loaded
    if (!sheet4) {
        console.error("Data not loaded. Please run loadFile() first.");
        return;
    }

    // Initialize objects to hold causes and impacts
    const causes = {};
    const impacts = {
        "Carbon Emissions": 0
    };

    // Process Sheet 4 (Subnational 1 carbon data)
    for (let i = 1; i < sheet4.length; i++) {
        const row = sheet4[i];
        const subnational = row[1]; // Subnational area
        const carbonEmissions = parseFloat(row[6]); // Carbon emissions (assuming it's the 7th column)

        if (subnational && !isNaN(carbonEmissions)) {
            // Sum up the carbon emissions by subnational area
            if (!causes[subnational]) {
                causes[subnational] = { treeLoss: 0, carbonEmissions: 0 };
            }
            causes[subnational].carbonEmissions += carbonEmissions;
        }
    }

    // Calculate total impacts
    Object.keys(causes).forEach((subnational) => {
        impacts["Carbon Emissions"] += causes[subnational].carbonEmissions || 0;
    });

    // Prepare data for Sankey diagram
    const nodes = [];
    const links = [];

    // Add causes (subnational areas) as source nodes
    const causeIndices = {};
    Object.keys(causes).forEach((subnational, index) => {
        causeIndices[subnational] = index; // Keep track of the indices
        nodes.push({ name: subnational });
    });

    // Add impacts as target nodes
    nodes.push({ name: "Carbon Emissions" });

    const carbonEmissionsIndex = nodes.length - 1;

    // Create links from causes to impacts
    Object.keys(causes).forEach((subnational) => {
        const index = causeIndices[subnational]; // Retrieve index
        if (causes[subnational].carbonEmissions > 0) {
            links.push({
                source: index,
                target: carbonEmissionsIndex,
                value: causes[subnational].carbonEmissions
            });
        }
    });

    console.log("Data processed. Nodes:", nodes);
    console.log("Links:", links);

    // Set up SVG dimensions and margins
    const margin = { top: 10, right: 30, bottom: 30, left: 40 };
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Remove any existing SVG
    d3.select("#sankey-diagram svg").remove();

    // Create an SVG element
    const svg = d3.select("#sankey-diagram")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    if (svg.empty()) {
        console.error("Failed to create SVG element");
        return;
    }

    console.log("SVG created successfully");

    // Create a Sankey generator
    const sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 1], [width - 1, height - 1]]);

    // Generate the Sankey data
    const graph = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    console.log("Sankey layout calculated");

    // Create a tooltip
    const tooltip = d3.select("#tooltip");

    // Draw the links
    svg.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("fill", "none")
        .attr("opacity", 0.5)
        .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible")
                .html(`Source: ${nodes[d.source].name}<br>Target: ${nodes[d.target].name}<br>Value: ${d.value}`)
                .style("top", (event.pageY - 10) + "px")
                .style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        });

    console.log("Links drawn");

    // Draw the nodes
    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("g");

    node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", "#ccc")
        .attr("stroke", "#000")
        .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible")
                .html(`Name: ${d.name}<br>Value: ${d.value || 0}`)
                .style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        });

    node.append("text")
        .attr("x", d => d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .text(d => d.name)
        .filter(d => d.x0 < width / 2)
        .attr("x", d => d.x1 + 6)
        .attr("text-anchor", "start");

    console.log("Nodes drawn");
    console.log("Sankey diagram creation completed");
}


// Update the createChoroplethMap function
function createChoroplethMap() {
    console.log("Creating choropleth map for year:", currentYear);
    
    if (!choroplethMap) {
        initializeMaps('choropleth');
    }

    if (choroplethLayer) {
        choroplethMap.removeLayer(choroplethLayer);
    }

    const yearColumnIndex = getYearColumnIndex(currentYear); // Get index for current year
    console.log("Year Column Index:", yearColumnIndex); // Log the index for verification

    fetch('data/states-topo.json')
        .then(response => response.json())
        .then(topoData => {
            const geoData = topojson.feature(topoData, topoData.objects.layer1);
            
            function styleFeature(feature) {
                const stateName = feature.properties.Name;
                
                // Find the corresponding row for the state in sheetData3
                const dataRow = sheetData3.find(row => 
                    row[sheetColumns3.indexOf("subnational1")] === stateName);
                
                let value = 0;
                if (dataRow && yearColumnIndex !== -1) {
                    value = parseFloat(dataRow[yearColumnIndex]) || 0; // Get the value for the selected year
                    console.log(`Value for ${stateName} in ${currentYear}:`, value); // Log the retrieved value
                }

                return {
                    fillColor: getColor(value),
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            }

            // Apply the color scale
            function getColor(d) {
                return d > 10000 ? '#081d58' :  // Very Dark Blue
                       d > 5000  ? '#253494' :  // Darker Blue
                       d > 2000  ? '#225ea8' :  // Medium Blue
                       d > 1000  ? '#1d91c0' :  // Light Blue
                       d > 500   ? '#41b6c4' :  // Lighter Blue
                       d > 200   ? '#7fcdbb' :  // Very Light Blue
                       d > 100   ? '#c7e9b4' :  // Pale Blue-Green
                                   '#edf8b1';   // Almost White (for very low values)
            }

            choroplethLayer = L.geoJson(geoData, {
                style: styleFeature,
                onEachFeature: function(feature, layer) {
                    const stateName = feature.properties.Name;
                    const yearColumnIndex = getYearColumnIndex(currentYear);
                    const dataRow = sheetData3.find(row => 
                        row[sheetColumns3.indexOf("subnational1")] === stateName);
                    
                    let value = 0;
                    if (dataRow && yearColumnIndex !== -1) {
                        value = parseFloat(dataRow[yearColumnIndex]) || 0;
                    }

                    layer.bindPopup(`
                        <strong>${stateName}</strong><br>
                        Deforestation in ${currentYear}: ${value.toLocaleString()} hectares
                    `);
                }
            }).addTo(choroplethMap);

            choroplethMap.fitBounds(choroplethLayer.getBounds());

            // Remove existing legend if any
            if (choroplethMap.legend) {
                choroplethMap.removeControl(choroplethMap.legend);
            }

            // Add legend at the top right
            var legend = L.control({ position: 'topright' });

            legend.onAdd = function (map) {
                var div = L.DomUtil.create('div', 'info legend'),
                    grades = [0, 100, 200, 500, 1000, 2000, 5000, 10000],
                    labels = [];

                // Loop through the density intervals and generate a label with a colored square for each interval
                for (var i = 0; i < grades.length; i++) {
                    div.innerHTML +=
                        '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                        grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
                }

                return div;
            };

            // Attach the new legend to the map and save reference to map object
            legend.addTo(choroplethMap);
            choroplethMap.legend = legend;
        })
        .catch(error => console.error('Error loading topology data:', error));
}


// Create Dot Distribution Map with Size Based on Hectare Loss
function createDotDistributionMap() {
    // Ensure the map is initialized before proceeding
    if (!dotDistributionMap) {
        initializeMaps('dotDistribution'); // Pass the correct map type
    }

    // Clear existing markers
    dotMarkers.forEach(marker => dotDistributionMap.removeLayer(marker));
    dotMarkers = [];

    // Fetch the topology data
    fetch('data/states-topo.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(topoData => {
            const geoData = topojson.feature(topoData, topoData.objects.layer1);

            // Process data by subnational2 areas using Sheet 5
            const subnational1Index = sheetColumns5.indexOf("subnational1");
            const subnational2Index = sheetColumns5.indexOf("subnational2");
            const tcLossIndex = sheetColumns5.indexOf(`tc_loss_ha_${currentYear}`);

            // Group data by subnational1 and subnational2
            const combinedData = {};

            sheetData5.forEach(row => {
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

            // Define a more visible color scale for the dots (increased contrast between values)
            function getDotColor(value) {
                return value > 10000 ? '#081d58' :  // Very Dark Blue
                    value > 5000  ? '#253494' :  // Darker Blue
                    value > 2000  ? '#225ea8' :  // Medium Blue
                    value > 1000  ? '#1d91c0' :  // Lighter Blue
                    value > 500   ? '#41b6c4' :  // Light Sky Blue
                    value > 200   ? '#7fcdbb' :  // Light Turquoise
                    value > 100   ? '#c7e9b4' :  // Pale Blue-Green
                    value > 50    ? '#edf8b1' :  // Lightest Yellow
                                    '#f7fbff';   // Almost White for very small values
            }

            // Create markers for the aggregated data
            Object.values(combinedData).forEach(data => {
                const { stateName, areaName, totalDeforestation } = data;

                if (totalDeforestation > 0 && stateFeatures.has(stateName)) {
                    const stateFeature = stateFeatures.get(stateName);
                    const cacheKey = `${stateName}_${areaName}_${currentYear}`;

                    // Check if the point is already in the cache
                    let point = randomPointCache[cacheKey];

                    // Generate a random point if it's not cached yet
                    if (!point) {
                        point = randomPointInPolygon(stateFeature);
                        randomPointCache[cacheKey] = point;  // Cache the point
                    }

                    if (point) {
                        const dotSize = Math.sqrt(totalDeforestation) / 10; // Adjust scaling factor as needed

                        if (dotSize > 0) { // Ensure size is valid
                            const marker = L.circleMarker([point[1], point[0]], {
                                radius: dotSize,  // Use dynamic size based on total deforestation value
                                fillColor: getDotColor(totalDeforestation),
                                color: "#000",
                                weight: 1,
                                opacity: 0.5,
                                fillOpacity: 0.8
                            }).addTo(dotDistributionMap);

                            marker.bindPopup(
                                `<strong>${stateName} - ${areaName}</strong><br>
                                Deforestation: ${totalDeforestation.toLocaleString()} hectares`
                            );

                            dotMarkers.push(marker);
                        }
                    }
                }
            });

            // Fit bounds to all markers
            if (dotMarkers.length > 0) {
                const group = L.featureGroup(dotMarkers);
                dotDistributionMap.fitBounds(group.getBounds());
            }

            // Remove existing legend if any
            if (dotDistributionMap.legend) {
                dotDistributionMap.removeControl(dotDistributionMap.legend);
            }

            // Add a legend at the top-right corner with a bigger container
            var legend = L.control({ position: 'topright' });

            legend.onAdd = function (map) {
                var div = L.DomUtil.create('div', 'info legend'),
                    sizes = [50, 100, 500, 1000, 5000, 10000],
                    labels = [];

                div.style.width = '180px';  // Increase width of legend container
                div.style.padding = '10px'; // Add padding to make it look cleaner

                div.innerHTML = '<strong>Tree Cover Loss (ha)</strong><br>';

                // Generate a label for each size with a sample circle and color
                for (var i = 0; i < sizes.length; i++) {
                    div.innerHTML +=
                        '<i style="background:' + getDotColor(sizes[i] + 1) + '; width:12px; height:12px; display:inline-block; border-radius:50%; margin-right:8px;"></i> ' +
                        sizes[i] + (sizes[i + 1] ? '&ndash;' + sizes[i + 1] + '<br>' : '+');
                }

                return div;
            };

            // Attach the new legend to the map and save reference to map object
            legend.addTo(dotDistributionMap);
            dotDistributionMap.legend = legend;
        })
        .catch(error => console.error("Error fetching topology data:", error));
}

// Random point in polygon function
function randomPointInPolygon(polygon, attempts = 10) {
    const coords = polygon.geometry.coordinates;

    // Choose a random polygon
    let chosenPolygon;
    if (polygon.geometry.type === 'Polygon') {
        chosenPolygon = coords;
    } else if (polygon.geometry.type === 'MultiPolygon') {
        chosenPolygon = coords[Math.floor(Math.random() * coords.length)];
    }

    const [minX, minY, maxX, maxY] = boundingBox(chosenPolygon[0]);
    let point = randomPointInBounds(minX, minY, maxX, maxY);

    // Check if the point is inside the polygon
    if (pointInPolygon(point, chosenPolygon[0])) {
        return point; // Return if point is valid
    }

    // If not valid and we have attempts left, try again
    if (attempts > 0) {
        return randomPointInPolygon(polygon, attempts - 1); // Reduce attempts
    }

    console.warn("Could not find a valid point within polygon after 10 attempts.");
    return null; // Return null if no valid point was found
}

// Function to create a bounding box for the polygon
function boundingBox(coordinates) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    coordinates.forEach(([x, y]) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    });
    
    return [minX, minY, maxX, maxY];
}

// Function to check if a point is inside a polygon
function pointInPolygon(point, polygon) {
    let x = point[0], y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        let xi = polygon[i][0], yi = polygon[i][1];
        let xj = polygon[j][0], yj = polygon[j][1];

        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

// Function to generate a random point within a bounding box
function randomPointInBounds(minX, minY, maxX, maxY) {
    const x = Math.random() * (maxX - minX) + minX;
    const y = Math.random() * (maxY - minY) + minY;
    return [x, y];
}

// Update the year slider event listener
document.getElementById('year-slider').addEventListener('input', (event) => {
    currentYear = parseInt(event.target.value);
    updateYearDisplay();
    createBubbleChart();
    createLineChart();
    createChoroplethMap();  
    createDotDistributionMap();
    createSankeyDiagram();
});


// Automatically load the file when the page loads
window.onload = function () {
    loadFile().then(() => {
        // Once data is loaded, create the visualizations
        showAllVisualizations();
    });
};


// Function to show all visualizations
function showAllVisualizations() {
    // Show all visualizations at once
    document.getElementById('bubble-chart').style.display = 'block';
    document.getElementById('line-chart').style.display = 'block';
    document.getElementById('choropleth-map').style.display = 'block';
    document.getElementById('dot-distribution-map').style.display = 'block';
    document.getElementById('sankey-diagram').style.display = 'block';

    // Initialize and create each chart
    createBubbleChart();
    createLineChart();
    createChoroplethMap(currentYear);
    createDotDistributionMap(currentYear);
    createSankeyDiagram();
}
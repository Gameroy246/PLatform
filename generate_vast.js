const fs = require('fs');
const path = require('path');
const os = require('os');

const desktopPath = path.join(os.homedir(), 'Desktop');

// Generate large dummy datasets
function generateCSV(filename, rows) {
    const header = "id,name,department,salary,join_date,status\n";
    let data = header;
    for (let i = 1; i <= rows; i++) {
        const dept = ["Sales", "Engineering", "HR", "Marketing"][Math.floor(Math.random() * 4)];
        const status = ["Active", "Inactive", "Terminated"][Math.floor(Math.random() * 3)];
        const salary = Math.floor(Math.random() * 100000) + 40000;
        data += `${i},User_${i},${dept},${salary},202${Math.floor(Math.random()*4)}-0${Math.floor(Math.random()*8)+1}-15,${status}\n`;
    }
    fs.writeFileSync(path.join(desktopPath, filename), data);
}

function generateJSON(filename, rows) {
    let data = [];
    for (let i = 1; i <= rows; i++) {
        data.push({
            id: i,
            region: ["North", "South", "East", "West"][Math.floor(Math.random() * 4)],
            performance_score: Math.floor(Math.random() * 100),
            bonus_eligible: Math.random() > 0.5 ? "Yes" : "No"
        });
    }
    fs.writeFileSync(path.join(desktopPath, filename), JSON.stringify(data));
}

// Generate the datasets
generateCSV("vast_data_1.csv", 50000);
generateCSV("vast_data_2.csv", 50000);
generateJSON("vast_data_3.json", 100000);

// Generate the pipeline nodes
const nodes = [];
const edges = [];

// 1. Inputs
nodes.push({
    id: "csvInput_1",
    type: "csvInput",
    position: { x: 0, y: 0 },
    data: { operation: "csvInput", files: [path.join(desktopPath, "vast_data_1.csv").replace(/\\/g, '/'), path.join(desktopPath, "vast_data_2.csv").replace(/\\/g, '/')] }
});

nodes.push({
    id: "jsonInput_1",
    type: "jsonInput",
    position: { x: 0, y: 300 },
    data: { operation: "jsonInput", files: [path.join(desktopPath, "vast_data_3.json").replace(/\\/g, '/')] }
});

// 2. Transform branch 1 (CSV)
nodes.push({ id: "fillMissing_1", type: "transform", position: { x: 300, y: 0 }, data: { operation: "fillMissing", column: "salary", defaultVal: "0", newCol: "salary" } });
edges.push({ id: "e1", source: "csvInput_1", target: "fillMissing_1", animated: true });

nodes.push({ id: "typeConversion_1", type: "transform", position: { x: 600, y: 0 }, data: { operation: "typeConversion", column: "salary", targetType: "DOUBLE", newCol: "salary" } });
edges.push({ id: "e2", source: "fillMissing_1", target: "typeConversion_1", animated: true });

nodes.push({ id: "textCasing_1", type: "transform", position: { x: 900, y: 0 }, data: { operation: "textCasing", column: "department", casing: "UPPER", newCol: "department" } });
edges.push({ id: "e3", source: "typeConversion_1", target: "textCasing_1", animated: true });

nodes.push({ id: "filterRows_1", type: "transform", position: { x: 1200, y: 0 }, data: { operation: "filterRows", filterCol: "salary", filterOp: ">", filterVal: "50000" } });
edges.push({ id: "e4", source: "textCasing_1", target: "filterRows_1", animated: true });

// 3. Transform branch 2 (JSON)
nodes.push({ id: "typeConversion_2", type: "transform", position: { x: 300, y: 300 }, data: { operation: "typeConversion", column: "performance_score", targetType: "DOUBLE", newCol: "performance_score" } });
edges.push({ id: "e5", source: "jsonInput_1", target: "typeConversion_2", animated: true });

nodes.push({ id: "filterRows_2", type: "transform", position: { x: 600, y: 300 }, data: { operation: "filterRows", filterCol: "performance_score", filterOp: ">", filterVal: "40" } });
edges.push({ id: "e6", source: "typeConversion_2", target: "filterRows_2", animated: true });

// 4. Join Branches
nodes.push({ id: "innerJoin_1", type: "transform", position: { x: 1500, y: 150 }, data: { operation: "innerJoin", joinCondition: "node_filterRows_1.id = node_filterRows_2.id" } });
edges.push({ id: "e7", source: "filterRows_1", target: "innerJoin_1", animated: true, sourceHandle: "source" });
edges.push({ id: "e8", source: "filterRows_2", target: "innerJoin_1", animated: true, sourceHandle: "source" });

// 5. Post-Join Transforms
nodes.push({ id: "mathFormula_1", type: "transform", position: { x: 1800, y: 150 }, data: { operation: "mathFormula", formula: "salary * (performance_score / 100.0)", newCol: "projected_bonus" } });
edges.push({ id: "e9", source: "innerJoin_1", target: "mathFormula_1", animated: true });

nodes.push({ id: "dataQuality_1", type: "transform", position: { x: 2100, y: 150 }, data: { operation: "dataQuality", column: "projected_bonus", operator: ">=", value: "0" } });
edges.push({ id: "e10", source: "mathFormula_1", target: "dataQuality_1", animated: true });

nodes.push({ id: "sortRows_1", type: "transform", position: { x: 2400, y: 150 }, data: { operation: "sortRows", column: "projected_bonus", direction: "DESC" } });
edges.push({ id: "e11", source: "dataQuality_1", sourceHandle: "source", target: "sortRows_1", animated: true });

const pipeline = {
    id: "vast_stress_test_pipeline",
    name: "Vast Enterprise Stress Test",
    nodes: nodes,
    edges: edges
};

fs.writeFileSync(path.join(desktopPath, "vast_stress_test_pipeline.json"), JSON.stringify(pipeline, null, 2));
console.log("Vast stress test generated on Desktop.");

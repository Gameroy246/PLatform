import requests
import json
import csv
import time

# 1. Create a dummy CSV file
with open("test.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "name", "age", "status"])
    writer.writerow([1, "Alice", 25, "active"])
    writer.writerow([2, "Bob", 35, "inactive"])
    writer.writerow([3, "Charlie", 40, "active"])
    writer.writerow([4, "David", 35, "active"])

# 2. Build Payload
# Simulating a pipeline:
# node_input -> node_filter (age >= 35) -> node_group (group by status, count)
payload = {
    "nodes": [
        {
            "id": "input",
            "sql": "SELECT * FROM read_csv_auto('test.csv')"
        },
        {
            "id": "filter",
            "sql": "SELECT * FROM node_input WHERE age >= 35"
        },
        {
            "id": "group",
            "sql": "SELECT status, COUNT(*) as count FROM node_filter GROUP BY status"
        }
    ],
    "edges": [
        {"id": "e1", "source": "input", "target": "filter"},
        {"id": "e2", "source": "filter", "target": "group"}
    ]
}

# 3. Test API
print("Sending request to backend...")
try:
    response = requests.post("http://localhost:8000/api/execute", json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)

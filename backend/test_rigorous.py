import requests
import json
import csv
import sys

# 1. Create a dummy CSV file
with open("test.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["id", "name", "age"])
    writer.writerow([1, "Alice", 25])
    writer.writerow([2, "Bob", 30])
    writer.writerow([3, "Charlie", 35])

BASE_URL = "http://localhost:8000/api/execute"
passed = 0
failed = 0

def run_test(name, payload, expected_status, expected_error_substring=None):
    global passed, failed
    print(f"Running Test: {name}")
    try:
        response = requests.post(BASE_URL, json=payload)
        if response.status_code == expected_status:
            if expected_error_substring:
                if expected_error_substring in response.text:
                    print("✅ Passed (Status & Substring Matched)\n")
                    passed += 1
                else:
                    print(f"❌ Failed: Expected substring '{expected_error_substring}' not found in {response.text}\n")
                    failed += 1
            else:
                print("✅ Passed\n")
                passed += 1
        else:
            print(f"❌ Failed: Expected status {expected_status}, got {response.status_code}\n")
            print(f"Response: {response.text}\n")
            failed += 1
    except Exception as e:
        print(f"❌ Failed: Exception occurred: {e}\n")
        failed += 1

# Test 1: Invalid SQL Generation (No SELECT)
payload_invalid_sql = {
    "nodes": [{"id": "n1", "sql": "DROP TABLE students;"}],
    "edges": []
}
run_test("Invalid SQL (No SELECT)", payload_invalid_sql, 400, "must start with SELECT")

# Test 2: Cyclic Dependency
payload_cycle = {
    "nodes": [
        {"id": "n1", "sql": "SELECT * FROM node_n2"},
        {"id": "n2", "sql": "SELECT * FROM node_n1"}
    ],
    "edges": [
        {"id": "e1", "source": "n1", "target": "n2"},
        {"id": "e2", "source": "n2", "target": "n1"}
    ]
}
run_test("Cyclic Dependency Detection", payload_cycle, 400, "Cyclic dependency")

# Test 3: SQL Syntax Error from DuckDB (Table not found)
payload_syntax_error = {
    "nodes": [{"id": "n1", "sql": "SELECT * FROM non_existent_table"}],
    "edges": []
}
run_test("DuckDB SQL Syntax Error", payload_syntax_error, 500, "Table with name non_existent_table does not exist")

# Test 4: Complex DAG (Diamond Pattern A -> B, A -> C, B+C -> D)
payload_diamond = {
    "nodes": [
        {"id": "A", "sql": "SELECT * FROM read_csv_auto('test.csv')"},
        {"id": "B", "sql": "SELECT id, name FROM node_A"},
        {"id": "C", "sql": "SELECT id, age FROM node_A"},
        {"id": "D", "sql": "SELECT B.id, B.name, C.age FROM node_B B INNER JOIN node_C C ON B.id = C.id"}
    ],
    "edges": [
        {"id": "e1", "source": "A", "target": "B"},
        {"id": "e2", "source": "A", "target": "C"},
        {"id": "e3", "source": "B", "target": "D"},
        {"id": "e4", "source": "C", "target": "D"}
    ]
}
run_test("Complex DAG Execution (Diamond)", payload_diamond, 200)

print(f"Tests Passed: {passed}")
print(f"Tests Failed: {failed}")
if failed > 0:
    sys.exit(1)

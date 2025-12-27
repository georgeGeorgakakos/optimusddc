import requests

sql = """
INSERT INTO datacatalog (_id, name, metadata_type, description, tags)
VALUES ('new_dataset_001', 'employee_data', 'hr', 
        'Employee records and organizational structure', 
        'hr,employee,confidential');
"""

payload = {
    "method": {"argcnt": 2, "cmd": "sqldml"},
    "args": ["dummy1", "dummy2"],
    "dstype": "dsswres",
    "sqldml": sql,
    "graph_traversal": [{}],
    "criteria": []
}

response = requests.post("http://localhost:18001/swarmkb/command", json=payload)
print(response.json())
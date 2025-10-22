#!/usr/bin/env python3
import requests
import json

# Test the template API endpoints
BASE_URL = "http://localhost:57988/api/templates"

def test_endpoint(endpoint, method="GET", data=None):
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        
        print(f"{method} {url} - Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
        else:
            print(f"Error: {response.text}")
        print("-" * 50)
    except Exception as e:
        print(f"Error testing {url}: {e}")
        print("-" * 50)

if __name__ == "__main__":
    print("Testing Template API Endpoints...")
    print("=" * 50)
    
    # Test categories endpoint
    test_endpoint("/categories")
    
    # Test items endpoint
    test_endpoint("/items")
    
    # Test stats endpoint
    test_endpoint("/stats")
    
    # Test collections endpoint
    test_endpoint("/collections")

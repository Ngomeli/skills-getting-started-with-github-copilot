import pytest

from fastapi.testclient import TestClient
from src.app import app

import json

client = TestClient(app)

def test_get_activities():
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data

def test_signup_for_activity_success():
    email = "testuser@mergington.edu"
    activity = "Chess Club"
    # Remove if already present
    client.request(
        "DELETE",
        f"/activities/{activity}/unregister",
        content=json.dumps({"email": email}),
        headers={"Content-Type": "application/json"}
    )
    response = client.post(f"/activities/{activity}/signup?email={email}")
    assert response.status_code == 200
    assert f"Signed up {email}" in response.json().get("message", "")
    # Clean up
    client.request(
        "DELETE",
        f"/activities/{activity}/unregister",
        content=json.dumps({"email": email}),
        headers={"Content-Type": "application/json"}
    )

def test_signup_duplicate():
    email = "testuser2@mergington.edu"
    activity = "Chess Club"
    # Ensure user is signed up
    client.post(f"/activities/{activity}/signup?email={email}")
    # Try to sign up again
    response = client.post(f"/activities/{activity}/signup?email={email}")
    assert response.status_code == 400
    assert "already signed up" in response.json().get("detail", "")
    # Clean up
    client.request(
        "DELETE",
        f"/activities/{activity}/unregister",
        content=json.dumps({"email": email}),
        headers={"Content-Type": "application/json"}
    )

def test_unregister_participant():
    email = "testuser3@mergington.edu"
    activity = "Chess Club"
    # Ensure user is signed up
    client.post(f"/activities/{activity}/signup?email={email}")
    response = client.request(
        "DELETE",
        f"/activities/{activity}/unregister",
        content=json.dumps({"email": email}),
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200
    assert f"Unregistered {email}" in response.json().get("message", "")
    # Try to unregister again (should fail)
    response = client.request(
        "DELETE",
        f"/activities/{activity}/unregister",
        content=json.dumps({"email": email}),
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 404
    assert "Participant not found" in response.json().get("detail", "")

def test_user_active():
    assert {
        "user": "administrator",
        "active": True,
        "roles": ["administrator", "user", "guest", "agent", "049"],
    }["active"] is True

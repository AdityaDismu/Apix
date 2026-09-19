def test_api_module_import():
    from api.main import app
    assert app.title.startswith('APIx')

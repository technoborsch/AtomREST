from django.http import HttpRequest
from AtomREST.settings import CURRENT_API_URL


def api_context(request: HttpRequest):
    """A context processor to throw an API root URL"""
    return {'api_url': CURRENT_API_URL}

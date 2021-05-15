from django.http import HttpRequest
from AtomproektBase import models


def projects_context(request: HttpRequest):
    """A simple context processor to include all Project models"""

    return {'projects': models.Project.objects.all()}

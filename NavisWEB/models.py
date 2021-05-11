from django.db import models
from constrainedfilefield.fields import ConstrainedFileField

from AtomproektBase import models as base_models


def get_upload_path(instance, filename):
    """Returns uploading path for a file here"""
    return f'models/{instance.building.slug}/{filename}'


class Model3D(models.Model):
    """A model for three-dimensional model of a building"""

    building = models.OneToOneField(
        base_models.Building,
        on_delete=models.CASCADE,
        related_name='model')
    nwd = ConstrainedFileField(
        upload_to=get_upload_path,
        blank=True,
        null=True,
    )
    last_updated = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Model of {self.building} building'

from django.db import models
from django.urls import reverse

from AtomproektBase import models as base_models


# Model
def get_upload_path(instance, filename):
    """Returns uploading path for a file here"""
    return f'models/{instance.building.slug}/{filename}'


class Model3D(models.Model):
    """A model for three-dimensional model of a building"""

    building = models.OneToOneField(
        base_models.Building,
        verbose_name='Здание',
        on_delete=models.CASCADE,
        related_name='model')
    nwd = models.FileField(
        verbose_name='Модель здания (формат .nwd)',
        upload_to=get_upload_path,
        blank=True,
        null=True,
    )
    gltf = models.FileField(
        verbose_name='Модель здания (формат .gltf)',
        upload_to=get_upload_path,
        blank=True,
        null=True,
    )
    last_updated = models.DateTimeField(auto_now_add=True, verbose_name='Время последнего обновления')

    def __str__(self):
        return f'Model of {self.building} building'  # pragma: no cover


# View point
def save_view_point(data):
    """Takes data from AJAX and creates a view point off it"""
    print(str(data['project']), str(data['building']))
    model = Model3D.objects.get(
        building__project__slug=str(data['project']),
        building__slug=str(data['building']),
    )

    ViewPoint.objects.create(
        model=model,
        position_x=float(data['position[x]']),
        position_y=float(data['position[y]']),
        position_z=float(data['position[z]']),
        direction_x=float(data['direction[x]']),
        direction_y=float(data['direction[y]']),
        direction_z=float(data['direction[z]']),
    )


class ViewPoint(models.Model):
    """A model to describe a viewpoint inside a building model"""
    model = models.ForeignKey(Model3D, on_delete=models.CASCADE, related_name='view_points')
    position_x = models.FloatField()
    position_y = models.FloatField()
    position_z = models.FloatField()
    direction_x = models.FloatField()
    direction_y = models.FloatField()
    direction_z = models.FloatField()
    date_time = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_time']

    def get_position(self):
        return self.position_x, self.position_y, self.position_z

    def get_direction(self):
        return self.direction_x, self.direction_y, self.direction_z

    def get_absolute_url(self):  # TODO move to another view 'viewpoint'
        return reverse(
            'building_model',
            kwargs={
                'model': self.model,
                'position': self.get_position(),
                'direction': self.get_direction(),
            })

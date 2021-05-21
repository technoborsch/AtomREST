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
    model = Model3D.objects.get(
        building__project__slug=str(data['project']),
        building__slug=str(data['building']),
    )

    created_viewpoint = ViewPoint.objects.create(
        model=model,
        position_x=float(data['position[x]']),
        position_y=float(data['position[y]']),
        position_z=float(data['position[z]']),
        target_x=float(data['target[x]']),
        target_y=float(data['target[y]']),
        target_z=float(data['target[z]']),
        clip_constant=float(data['clipConstant']),
    )
    created_viewpoint.save()
    return created_viewpoint


class ViewPoint(models.Model):
    """A model to describe a viewpoint inside a building model"""
    model = models.ForeignKey(Model3D, on_delete=models.CASCADE, related_name='view_points')
    position_x = models.FloatField()
    position_y = models.FloatField()
    position_z = models.FloatField()
    target_x = models.FloatField()
    target_y = models.FloatField()
    target_z = models.FloatField()
    clip_constant = models.FloatField()
    date_time = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_time']

    def get_position(self):
        return self.position_x, self.position_y, self.position_z

    def get_target(self):
        return self.target_x, self.target_y, self.target_z

    def get_absolute_url(self):  # TODO move to API
        return reverse(
            'view_point',
            kwargs={
                'project': self.model.building.project.slug,
                'building': self.model.building.slug,
                'pk': self.pk,
            })

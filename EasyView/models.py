from django.db import models
from django.urls import reverse
from django.contrib.postgres.fields import ArrayField

from AtomREST.settings import CURRENT_URL
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
        verbose_name='Модель здания (формат .gltf или .glb)',
        upload_to=get_upload_path,
        blank=True,
        null=True,
    )
    last_updated = models.DateTimeField(auto_now_add=True, verbose_name='Время последнего обновления')

    def __str__(self):
        return f'Model of {self.building} building'  # pragma: no cover


class ViewPoint(models.Model):
    """A model to describe a viewpoint inside a building model"""
    model = models.ForeignKey(Model3D, on_delete=models.CASCADE, related_name='view_points')
    description = models.TextField(blank=True, null=True)
    position = ArrayField(models.FloatField(), size=3)  # x, y, z
    quaternion = ArrayField(models.FloatField(), size=4)  # x, y, z, w
    distance_to_target = models.FloatField(blank=True, null=True)
    clip_constants_status = ArrayField(models.BooleanField(), size=6, blank=True, default=[False] * 6)
    clip_constants = ArrayField(  # x, x negative, y, y negative, z, z negative TODO synchronise with NW clip constants
        models.FloatField(), size=6, blank=True, null=True
    )
    creation_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creation_time']

    def get_absolute_url(self):
        return CURRENT_URL + reverse(
            'view_point',
            kwargs={
                'project': self.model.building.project.slug,
                'building': self.model.building.slug,
                'pk': self.pk,
            })


class Note(models.Model):
    """Class that represents a note that user can leave in a model"""
    view_point = models.ForeignKey(
        ViewPoint,
        on_delete=models.CASCADE,
        related_name='notes',
    )
    text = models.TextField()
    position = ArrayField(models.FloatField(), size=3, null=True)  # x, y, z
    creation_time = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-creation_time']


class Remark(models.Model):
    """A class that represents a remark model"""
    SPECIALITIES = [
        ('Process', 'Технология'),
        ('Electrical', 'Электрика'),
        ('HVAC', 'Вентиляция'),
    ]

    STATUSES = [
        ('Uncompleted', 'Не выполнено'),
        ('Completed', 'Выполнено'),
    ]

    view_point = models.ForeignKey(ViewPoint, on_delete=models.CASCADE, related_name='remark')
    description = models.TextField()
    speciality = models.CharField(max_length=11, choices=SPECIALITIES)
    reviewer = models.CharField(max_length=100)
    responsible_person = models.CharField(max_length=100, blank=True, null=True)
    comment = models.TextField(blank=True, null=True)
    deadline = models.DateField()
    status = models.CharField(max_length=11, blank=True, choices=STATUSES, default=STATUSES[0])

    creation_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creation_time']

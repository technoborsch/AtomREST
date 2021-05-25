from datetime import datetime, timedelta

from django.db import models
from django.urls import reverse

from AtomREST.settings import NOTE_EXPIRY_DAYS
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


# View point
class ViewPoint(models.Model):
    """A model to describe a viewpoint inside a building model"""
    model = models.ForeignKey(Model3D, on_delete=models.CASCADE, related_name='view_points')
    description = models.TextField(blank=True, null=True)
    position_x = models.FloatField()
    position_y = models.FloatField()
    position_z = models.FloatField()
    target_x = models.FloatField()
    target_y = models.FloatField()
    target_z = models.FloatField()
    clip_constant_y = models.FloatField()
    clip_constant_y_neg = models.FloatField()
    clip_constant_x = models.FloatField()
    clip_constant_x_neg = models.FloatField()
    clip_constant_z = models.FloatField()
    clip_constant_z_neg = models.FloatField()
    date_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_time']

    def get_absolute_url(self):
        return 'http://127.0.0.1:8000' + reverse(  # FIXME Hard-coded hostname
            'view_point',
            kwargs={
                'project': self.model.building.project.slug,
                'building': self.model.building.slug,
                'pk': self.pk,
            })


class NoteManager(models.Manager):
    """A manager for Note model to override standard query and simulate auto-deletion on specific time"""
    def get_queryset(self):
        now = datetime.now()
        min_created_at = now - timedelta(days=NOTE_EXPIRY_DAYS)
        # TODO add logic to return only if attached to a viewpoint or not expired
        return super(NoteManager, self).get_queryset().filter(time_created__gt=min_created_at)


class Note(models.Model):
    """Class that represents a note that user can leave in a model"""
    model = models.ForeignKey(Model3D, on_delete=models.CASCADE, related_name='notes')
    view_point = models.ForeignKey(
        ViewPoint,
        on_delete=models.CASCADE,
        related_name='attached_notes',
        blank=True,
        null=True,
    )
    text = models.TextField()
    position_x = models.FloatField()
    position_y = models.FloatField()
    position_z = models.FloatField()
    time_created = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-time_created']

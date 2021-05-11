from django.db import models
from pytils.translit import slugify


class SlugBase(models.Model):
    """Base to add a slug field to a model"""

    field_to_slugify = ''

    slug = models.SlugField(
        allow_unicode=True,
        blank=True,
        null=True,
    )

    def save(self, *args, **kwargs):
        if not self.slug:
            if not self.field_to_slugify:
                raise ValueError('Specify a field to slugify')
            elif not hasattr(self, self.field_to_slugify):
                raise ValueError('Wrong field to slugify - here is no such field')
            self.slug = slugify(self.__getattribute__(self.field_to_slugify))
        super(SlugBase, self).save(*args, **kwargs)

    class Meta:
        abstract = True


class Project(SlugBase):
    """Model for a project of NPP"""

    name = models.CharField(max_length=30, unique=True, verbose_name='Имя проекта')
    country = models.CharField(max_length=30, verbose_name='Страна')
    description = models.TextField(max_length=1000, verbose_name='Описание')
    stage = models.CharField(max_length=10, verbose_name='Текущая стадия')

    field_to_slugify = 'name'


class Building(SlugBase):
    """Model for a building of NPP"""

    kks = models.CharField(
        max_length=20,
        verbose_name='KKS-код здания'
    )
    name = models.CharField(max_length=200, verbose_name='Официальное точное название')
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='buildings',
        verbose_name='Проект, которому принадлежит здание',
    )

    field_to_slugify = 'kks'

    class Meta:
        ordering = ['kks']
        constraints = [
            models.UniqueConstraint(
                fields=['kks', 'project'],
                name='Здание с таким KKS-кодом уже присутсвует в данном проекте',
            )  # To raise validation error when trying to add an existing building to a project
        ]


class System(SlugBase):
    """The model for a system - part of the NPP"""

    SEISMIC_CATEGORIES = [
        ("1", "First"),
        ("2", "Second"),
        ("3", "Third"),
        ("4", "Fourth"),
        ("NA", "Not specified"),
    ]

    SAFETY_CATEGORIES = [
        ("1", "First class"),
        ("2", "Second class"),
        ("3", "Third class"),
        ("4", "Fourth class"),
        ("EYT", "EYT"),
        ("NA", "Not specified"),
    ]

    kks = models.CharField(
        max_length=20,
        unique=True,
        verbose_name='KKS-код системы'
    )
    name = models.CharField(max_length=200, verbose_name='Точное название системы')
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='systems',
        verbose_name='Проект, которому принадлежит система')
    buildings = models.ManyToManyField(
        Building,
        related_name='systems',
        verbose_name='Перечень зданий, в которых находится система')
    seismic_category = models.CharField(max_length=3, choices=SEISMIC_CATEGORIES)
    safety_category = models.CharField(max_length=3, choices=SAFETY_CATEGORIES)

    field_to_slugify = 'kks'

    class Meta:
        ordering = ['kks']
        constraints = [
            models.UniqueConstraint(
                fields=['kks', 'project'],
                name='Система с таким KKS-кодом уже присутсвует в данном проекте'
            )  # To raise validation error when trying to add an existing building to a project
        ]

from django.db import models
from pytils.translit import slugify


class SlugBase(models.Model):
    """Base to add a slug field to a model"""

    fields_to_slugify = []

    slug = models.SlugField(
        unique=True,
        allow_unicode=True,
        blank=True,
        null=True,
    )

    def save(self, *args, **kwargs):
        if not self.slug:
            self._check_fields_to_slugify()
            self._save_slug()
        super(SlugBase, self).save(*args, **kwargs)

    def _check_fields_to_slugify(self):
        """It checks if fields to slugify were set correctly"""
        if not self.fields_to_slugify:
            raise ValueError('Specify fields to slugify')
        elif not isinstance(self.fields_to_slugify, list):
            raise ValueError('Fields to slugify should be instance of list')
        for field in self.fields_to_slugify:
            if not hasattr(self, field):
                raise ValueError(f'Wrong field "{field}" to slugify - here is no such field')
            attribute = self.__getattribute__(field)
            # so attribute is either a model
            if isinstance(attribute, models.Model):
                if not hasattr(attribute, 'slug'):
                    raise ValueError(f'{attribute} model has no slug field, which is required')
            # or it's a string
            elif not isinstance(attribute, str):
                raise ValueError('Field to slugify should be either a model with slug or string')

    def _save_slug(self):
        """It collects all data to produce a slug and saves it"""
        slug_list = []
        for field in self.fields_to_slugify:
            attribute = self.__getattribute__(field)
            if isinstance(attribute, models.Model):
                attribute = attribute.slug
            slug_list.append(attribute)
        self.slug = '_'.join(map(slugify, slug_list))

    def __str__(self):
        return self.slug  # pragma: no cover

    class Meta:
        abstract = True


class Project(SlugBase):
    """Model for a project of NPP"""

    name = models.CharField(max_length=30, unique=True, verbose_name='Имя проекта')
    country = models.CharField(max_length=30, verbose_name='Страна')
    description = models.TextField(max_length=1000, verbose_name='Описание')
    stage = models.CharField(max_length=10, verbose_name='Текущая стадия')

    fields_to_slugify = ['name']


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

    fields_to_slugify = ['kks']

    class Meta:
        ordering = ['kks']


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

    fields_to_slugify = ['kks']

    class Meta:
        ordering = ['kks']

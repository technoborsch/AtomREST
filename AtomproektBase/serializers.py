from rest_framework import serializers

from . import models


class ProjectSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a project model"""

    class Meta:
        model = models.Project
        fields = ('url', 'name', 'buildings', 'country', 'description', 'stage')
        extra_kwargs = {
            'url': {'lookup_field': 'slug'},
            'buildings': {'lookup_field': 'slug'}
        }


class BuildingSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a building model"""

    class Meta:
        model = models.Building
        fields = ('url', 'kks', 'name', 'project', 'systems', 'model')
        extra_kwargs = {
            'url': {'lookup_field': 'slug'},
            'project': {'lookup_field': 'slug'},
            'systems': {'lookup_field': 'slug'},
            'model': {'lookup_field': 'building', 'required': False, 'allow_null': True}
        }


class SystemSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a system model"""
    class Meta:
        model = models.System
        fields = ('url', 'kks', 'name', 'project', 'buildings', 'seismic_category', 'safety_category')
        extra_kwargs = {
            'url': {'lookup_field': 'slug'},
            'project': {'lookup_field': 'slug'},
            'buildings': {'lookup_field': 'slug'}
        }


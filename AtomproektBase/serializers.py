from rest_framework import serializers

from . import models


class ProjectSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a project model"""

    class Meta:
        model = models.Project
        fields = ('url', 'name', 'buildings', 'country', 'description', 'stage', 'slug')
        extra_kwargs = {'slug': {'read_only': True}}


class BuildingSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a building model"""

    class Meta:
        model = models.Building
        fields = ('url', 'kks', 'name', 'project', 'systems', 'model', 'slug')
        extra_kwargs = {
            'model': {'required': False, 'allow_null': True},
            'slug': {'read_only': True}
        }


class SystemSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a system model"""
    class Meta:
        model = models.System
        fields = ('url', 'kks', 'name', 'project', 'buildings', 'seismic_category', 'safety_category', 'slug')
        extra_kwargs = {'slug': {'read_only': True}}

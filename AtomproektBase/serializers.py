from rest_framework import serializers

from . import models


class ProjectSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a project model"""
    class Meta:
        model = models.Project
        fields = ('url', 'name', 'country', 'description', 'stage', 'slug', 'buildings')


class BuildingSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a building model"""
    class Meta:
        model = models.Building
        fields = ('url', 'kks', 'name', 'project', 'systems', 'model', 'slug')


class SystemSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a system model"""
    class Meta:
        model = models.System
        fields = ('url', 'kks', 'name', 'project', 'buildings', 'seismic_category', 'safety_category', 'slug')

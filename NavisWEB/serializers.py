from rest_framework import serializers

from NavisWEB import models


class Model3DSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a building model"""
    class Meta:
        model = models.Model3D
        fields = ['url', 'building', 'nwd', 'gltf', 'view_points', 'notes']


class ViewPointSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer for view points"""
    class Meta:
        model = models.ViewPoint
        exclude = ['creation_time']

    viewer_url = serializers.CharField(source='get_absolute_url', read_only=True)


class NoteSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer for notes"""
    class Meta:
        model = models.Note
        exclude = ['creation_time']

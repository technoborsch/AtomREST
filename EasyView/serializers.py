from rest_framework import serializers

from EasyView import models


class Model3DSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a building model"""
    class Meta:
        model = models.Model3D
        fields = ['url', 'pk', 'building', 'nwd', 'gltf', 'view_points']
        read_only_fields = ['pk', 'url']


class ViewPointSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer for view points"""
    class Meta:
        model = models.ViewPoint
        fields = ['pk', 'url', 'viewer_url', 'position', 'quaternion', 'fov', 'description', 'distance_to_target',
                  'clip_constants_status', 'clip_constants', 'creation_time', 'model', 'notes', 'remark']
        read_only_fields = ['pk', 'url', 'viewer_url', 'creation_time', 'notes', 'remark']

    viewer_url = serializers.CharField(source='get_absolute_url', read_only=True)


class NoteSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer for notes"""
    class Meta:
        model = models.Note
        exclude = ['creation_time']


class RemarkSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer for remarks"""
    class Meta:
        model = models.Remark
        fields = ['pk', 'url', 'view_point', 'description', 'speciality', 'reviewer', 'responsible_person',
                  'comment', 'deadline', 'status', 'creation_time']
        read_only_fields = ['pk', 'url', 'creation_time']

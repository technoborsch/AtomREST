from rest_framework import serializers

from NavisWEB import models


class Model3DSerializer(serializers.HyperlinkedModelSerializer):
    """Serializer class for a building model"""
    class Meta:
        model = models.Model3D
        fields = ['url', 'building', 'nwd']
        lookup_field = 'building'
        extra_kwargs = {
            'url': {'lookup_field': 'building'},
            'building': {'lookup_field': 'slug'}
        }

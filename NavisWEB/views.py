from rest_framework import viewsets
from rest_framework import permissions

from NavisWEB import serializers, models


class Model3DViewSet(viewsets.ModelViewSet):
    """View set for a 3D model"""
    queryset = models.Model3D.objects.all()
    serializer_class = serializers.Model3DSerializer
    permission_classes = [permissions.IsAuthenticated]

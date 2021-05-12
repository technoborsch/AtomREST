from rest_framework import viewsets
from rest_framework import permissions

from AtomproektBase import serializers, models


class ProjectViewSet(viewsets.ModelViewSet):
    """View set for a project model"""
    queryset = models.Project.objects.all()
    serializer_class = serializers.ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'slug'


class BuildingViewSet(viewsets.ModelViewSet):
    """View set for a building model"""
    queryset = models.Building.objects.all()
    serializer_class = serializers.BuildingSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'slug'


class SystemViewSet(viewsets.ModelViewSet):
    """View set for a system model"""
    queryset = models.System.objects.all()
    serializer_class = serializers.SystemSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'slug'

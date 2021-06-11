from django.views.generic import TemplateView, DetailView
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from EasyView import serializers, models


class IndexTemplateView(TemplateView):
    """A view for index page"""
    template_name = 'base_layout.html'


class BuildingModelView(DetailView):
    """A view to display a model of building"""

    model = models.Model3D
    template_name = 'building_model.html'
    context_object_name = 'model'

    def get_object(self, queryset=None):
        return models.Model3D.objects.get(
            building__project__slug=self.kwargs['project'],
            building__slug=self.kwargs['building'],
        )

    def get_context(self, **kwargs):
        context = super(BuildingModelView, self).get_context_data(**kwargs)
        context['remarks'] = models.Remark.objects.filter(view_point__model=self.object)


class ViewPointView(DetailView):
    """A view to show a viewpoint in a model"""

    model = models.ViewPoint
    template_name = 'view_point.html'
    context_object_name = 'view_point'

    def get_queryset(self):
        return models.ViewPoint.objects.filter(
            model__building__project__slug=self.kwargs['project'],
            model__building__slug=self.kwargs['building'],
        )


# REST API
class Model3DViewSet(viewsets.ModelViewSet):
    """View set for a 3D model"""
    queryset = models.Model3D.objects.all()
    serializer_class = serializers.Model3DSerializer


class ViewPointViewSet(viewsets.ModelViewSet):
    """View set for view points"""
    queryset = models.ViewPoint.objects.all()
    serializer_class = serializers.ViewPointSerializer


class NotesViewSet(viewsets.ModelViewSet):
    """View set for notes model"""
    queryset = models.Note.objects.all()
    serializer_class = serializers.NoteSerializer


class RemarksViewSet(viewsets.ModelViewSet):
    """View set for view points"""
    queryset = models.Remark.objects.all()
    serializer_class = serializers.RemarkSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

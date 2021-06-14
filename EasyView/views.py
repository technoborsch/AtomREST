import tempfile

from django.views.generic import TemplateView, DetailView
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpRequest, HttpResponse
from django.core.files import File
from django.utils.decorators import method_decorator

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from EasyView import serializers, models, import_export


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


# Views for export/import of viewpoints
@method_decorator(csrf_exempt, name='dispatch')
class ExportViewPointsView(View):  # TODO add errors handling
    """A view that processes incoming GET request and prepares an XML file with viewpoints to return"""
    def get(self, request: HttpRequest):
        viewpoints_pk_list = self.request.GET.get('viewpoints_pk_list', None).split(',')
        if viewpoints_pk_list and viewpoints_pk_list != ['']:
            xml = import_export.create_exported_viewpoints_xml(viewpoints_pk_list)
            with tempfile.TemporaryFile() as tf:
                xml.write(tf)
                response = HttpResponse(File(tf), content_type='application/force-download')
                response['Content-Disposition'] = 'attachment; filename=viewpoints_export.xml'
                return response
        else:
            return HttpResponse(status=400)


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

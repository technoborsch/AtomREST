from tempfile import TemporaryFile
import random

from django.views.generic import TemplateView, DetailView
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.core.files import File
from django.utils.decorators import method_decorator

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from AtomREST.settings import CURRENT_API_URL
from EasyView import serializers, models, import_export, content


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

    def get_context_data(self, **kwargs):
        context = super(BuildingModelView, self).get_context_data(**kwargs)
        context['api_url'] = CURRENT_API_URL
        context['no_remarks_tips'] = []
        for speciality in models.Remark.SPECIALITIES:
            context[f'{speciality[0]}_remarks'] = models.Remark.objects.filter(
                view_point__model=self.object,
                speciality=speciality[0],
            )
            context['no_remarks_tips'].append(random.choice(content.NO_REMARKS_TIPS))
        return context


class ViewPointView(BuildingModelView):
    """A view to show a viewpoint in a model"""

    template_name = 'view_point.html'

    def get_context_data(self, **kwargs):
        context = super(ViewPointView, self).get_context_data(**kwargs)
        context['view_point'] = models.ViewPoint.objects.get(pk=self.kwargs['pk'])
        return context


# Views for export/import of viewpoints
@method_decorator(csrf_exempt, name='dispatch')
class ExportViewPointsView(View):  # TODO add errors handling
    """A view that processes incoming GET request and prepares an XML file with viewpoints to return"""
    def get(self, request: HttpRequest):
        viewpoints_pk_list = self.request.GET.get('viewpoints_pk_list', None).split(',')
        if viewpoints_pk_list and viewpoints_pk_list != ['']:
            xml = import_export.create_exported_viewpoints_xml(viewpoints_pk_list)
            with TemporaryFile() as tf:
                xml.write(tf)
                response = HttpResponse(File(tf), content_type='application/force-download')
                response['Content-Disposition'] = 'attachment; filename=viewpoints_export.xml'
                return response
        else:
            return HttpResponse(status=400)


@method_decorator(csrf_exempt, name='dispatch')
class ImportViewPointsView(View):  # TODO add errors handling
    """
    A view that processes incoming file and tries to save viewpoints off it, then returns JSON with a list
    of saved viewpoints' pks.
    """
    def post(self, request: HttpRequest):
        file = self.request.FILES['file']  # TODO try-except
        model_pk = self.request.POST['model']
        if file:
            pks_list = import_export.import_navisworks_viewpoints(file, model_pk)  # TODO try-except
            return JsonResponse({'list': pks_list})
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

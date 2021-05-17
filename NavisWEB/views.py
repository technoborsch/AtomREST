from django import views
from django.views.generic import TemplateView, DetailView
from django.http import JsonResponse, HttpResponse, HttpRequest
from rest_framework import viewsets
from rest_framework import permissions

from NavisWEB import serializers, models


class IndexTemplateView(TemplateView):
    """A view for index page"""
    template_name = 'base_layout.html'


class BuildingModelView(DetailView):
    """A view to display a model of building"""

    model = models.Model3D
    template_name = 'building_model.html'
    context_object_name = 'model'

    def get_object(self, queryset=None):
        print(self.kwargs['project'], self.kwargs['building'])
        return models.Model3D.objects.get(
            building__project__slug=self.kwargs['project'],
            building__slug=self.kwargs['building'],
        )


# View points
class ViewPointCreateView(views.View):
    """AJAX-view to save view points"""
    def get(self, request: HttpRequest):
        if request.is_ajax():
            try:
                models.save_view_point(data=request.GET)
                return JsonResponse({"status": "ok"})
            except (KeyError, ValueError):
                return JsonResponse({"status": "error", "description": "wrong request"})
        else:
            return HttpResponse(status=404)


# REST API
class Model3DViewSet(viewsets.ModelViewSet):
    """View set for a 3D model"""
    queryset = models.Model3D.objects.all()
    serializer_class = serializers.Model3DSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_object(self):
        return models.Model3D.objects.get(building__slug=self.kwargs['building'])


# AJAX views here
class SessionModifier(views.View):
    """A view to handle AJAX session manipulations"""

    def get(self, request: HttpRequest, *args, **kwargs):
        """
        It manipulates with the key of a session ["shown_ids"], which is a list of ids of HTML elements of the site
        that have to appear in shown state on reload. Maybe this is an inventing of bicycle here, but why not
        """
        if request.is_ajax():  # only ajax here, else 404
            try:
                key, value = str(request.GET["key"]), str(request.GET["value"])
                # create here this list if it doesn't exists (first visit for example)
                if "shown_ids" not in request.session.keys():
                    request.session["shown_ids"] = list()
                if key == "hide":
                    return self._handle_hide(request, value)
                elif key == "show":
                    return self._handle_show(request, value)
                else:  # there was some unknown key
                    return JsonResponse({"status": "error", "description": "no matching keys"})
            except (KeyError, ValueError):
                return JsonResponse({"status": "error", "description": "wrong request"})
        else:
            # do not allow to access this address via browser
            return HttpResponse(status=404)

    @staticmethod
    def _handle_show(request: HttpRequest, value: str):
        """Handle session keys when receive "show" command"""
        shown_ids_list = request.session["shown_ids"]
        if value not in shown_ids_list:
            # add this id to the list
            shown_ids_list.append(value)
            request.session["shown_ids"] = shown_ids_list
            return JsonResponse({"status": "OK", "shown": value})
        else:
            # do nothing
            return JsonResponse({"status": "already shown"})

    @staticmethod
    def _handle_hide(request: HttpRequest, value: str):
        """Handle session keys when receive "hide" command"""
        shown_ids_list = request.session["shown_ids"]
        if value in shown_ids_list:
            # then remove this id from the list
            shown_ids_list.remove(value)
            request.session["shown_ids"] = shown_ids_list
            return JsonResponse({"status": "OK", "hide": value})
        else:
            # do nothing
            return JsonResponse({"status": "already hidden"})

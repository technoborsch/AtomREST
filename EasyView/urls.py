from django.urls import path

from . import views

urlpatterns = [
    path('', views.IndexTemplateView.as_view(), name='index'),
    path('<slug:project>/<slug:building>', views.BuildingModelView.as_view(), name='building_model'),
    path('<slug:project>/<slug:building>/<pk>', views.ViewPointView.as_view(), name='view_point'),
    path('404', views.Error404.as_view(), name='error404'),  # TODO Remove in production
]

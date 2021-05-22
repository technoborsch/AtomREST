from django.urls import path

from . import views

urlpatterns = [
    path('', views.IndexTemplateView.as_view(), name='index'),
    path('<slug:project>/<slug:building>', views.BuildingModelView.as_view(), name='building_model'),
    path('<slug:project>/<slug:building>/<pk>', views.ViewPointView.as_view(), name='view_point'),
    path('create_view_point', views.ViewPointCreateView.as_view(), name='create_view_point'),  # TODO move to API

    # AJAX manipulations TODO move to API or remove
    path('session/', views.SessionModifier.as_view(), name='session'),
]

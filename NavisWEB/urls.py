from django.urls import path

from . import views

urlpatterns = [
    path('', views.IndexTemplateView.as_view(), name='index'),
    path('<slug:project>/<slug:building>', views.BuildingModelView.as_view(), name='building_model'),
    path('create/view_point', views.ViewPointCreateView.as_view(), name='create_view_point'),

    # AJAX manipulations
    path('session/', views.SessionModifier.as_view(), name='session'),
]

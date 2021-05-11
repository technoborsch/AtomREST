"""AtomREST URL Configuration"""

from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from AtomproektBase import views as base_views
from NavisWEB import views as model_views

router = routers.DefaultRouter()
router.register(r'projects', base_views.ProjectViewSet)
router.register(r'buildings', base_views.BuildingViewSet)
router.register(r'systems', base_views.SystemViewSet)
router.register(r'models', model_views.Model3DViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework'))
]

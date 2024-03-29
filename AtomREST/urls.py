"""AtomREST URL Configuration"""

from django.contrib import admin
from django.urls import path, include
from django.contrib.staticfiles.urls import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from rest_framework import routers

from AtomREST import settings
from AtomproektBase import views as base_views
from EasyView import views as model_views

router = routers.DefaultRouter()
router.register(r'projects', base_views.ProjectViewSet)
router.register(r'buildings', base_views.BuildingViewSet)
router.register(r'systems', base_views.SystemViewSet)
router.register(r'models', model_views.Model3DViewSet)
router.register(r'view_points', model_views.ViewPointViewSet)
router.register(r'notes', model_views.NotesViewSet)
router.register(r'remarks', model_views.RemarksViewSet)

urlpatterns = [
    path('api/v1/view_points_export', model_views.ExportViewPointsView.as_view(), name='view_points_export'),
    path('api/v1/view_points_import', model_views.ImportViewPointsView.as_view(), name='view_points_import'),
    path('', include('EasyView.urls')),
    path('api/v1/', include(router.urls)),
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework'))
]

urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

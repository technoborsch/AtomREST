import os
import uuid
import xml.etree.ElementTree as ET
from xml.etree.ElementTree import Element

from django.core.exceptions import ObjectDoesNotExist

from AtomREST.settings import BASE_DIR
from EasyView.models import ViewPoint


def create_exported_viewpoints_xml(pk_list: list) -> ET:
    """
    Function that makes XML files with view points, which can be used in Autodesk Navisworks.

    :param pk_list: list that contents primary keys of saved view points that should be exported.
    Keys can be str or int.

    :return:
    """
    path_to_template = os.path.join(BASE_DIR, 'EasyView', 'static', 'EasyView', 'export', 'general_template.xml')
    general_template = ET.parse(path_to_template)
    exchange = general_template.getroot()
    viewpoints = exchange[0]
    for pk in pk_list:
        try:
            view_point = ViewPoint.objects.get(pk=int(pk))
            view = export_viewpoint_to_nw(view_point)
            viewpoints.append(view)
        except ObjectDoesNotExist:
            pass
    return general_template


def export_viewpoint_to_nw(view_point: ViewPoint) -> Element:
    """
    Represents current view point as a NavisWorks view point XML structure

    :param view_point: ViewPoint instance that should be represented in XML
    :return: XML Element instance with inserted view point
    """

    path_to_viewpoint_template = os.path.join(
        BASE_DIR, 'EasyView', 'static', 'EasyView', 'export', 'view_point_template.xml')
    viewpoint_template = ET.parse(path_to_viewpoint_template)
    view = viewpoint_template.getroot()
    # View point - position and rotation
    pos3f = view[0][0][0][0]
    quaternion = view[0][0][1][0]

    view_attributes = (
        ('guid', str(uuid.uuid4())),
        ('name', view_point.description)
    )
    pos3f_attributes = tuple(zip(('x', 'y', 'z',), map(lambda x: str(x), view_point.position)))
    quaternion_attributes = tuple(zip(('a', 'b', 'c', 'd'), map(lambda x: str(x), view_point.quaternion)))

    # Clipping planes
    clip_plane_set = view[1]
    clip_planes = clip_plane_set[1]

    clipped = False
    clip_counter = 0
    for i, status in enumerate(view_point.clip_constants_status):
        if status:
            if not clipped:
                clipped = True
            clip_counter += 1
            clip_planes[i].set('state', 'enabled')
            clip_planes[i][0].set('distance', f'{view_point.clip_constants[i]:.10f}')

    if clipped:
        clip_plane_set.set('enabled', '1')
        clip_plane_set.set('current', str(clip_counter - 1))

    element_attribute_pairs = (
        (view, view_attributes),
        (pos3f, pos3f_attributes),
        (quaternion, quaternion_attributes),
    )
    for element, attributes in element_attribute_pairs:
        for attribute, value in attributes:
            element.set(attribute, value)

    return view

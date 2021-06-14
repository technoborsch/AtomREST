import os
import uuid
import xml.etree.ElementTree as ET

from django.core.exceptions import ObjectDoesNotExist

from AtomREST.settings import BASE_DIR
from EasyView.models import ViewPoint


def create_exported_viewpoints_xml(pk_list: list):
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


def export_viewpoint_to_nw(view_point: ViewPoint):
    """Represents current view point as a NavisWorks view point XML structure"""

    path_to_viewpoint_template = os.path.join(
        BASE_DIR, 'EasyView', 'static', 'EasyView', 'export', 'view_point_template.xml')
    viewpoint_template = ET.parse(path_to_viewpoint_template)
    view = viewpoint_template.getroot()
    pos3f = view[0][0][0][0]
    quaternion = view[0][0][1][0]

    view_attributes = (
        ('guid', str(uuid.uuid4())),
        ('name', view_point.description)
    )
    pos3f_attributes = tuple(zip(('x', 'y', 'z',), map(lambda x: str(x), view_point.position)))
    quaternion_attributes = tuple(zip(('a', 'b', 'c', 'd'), map(lambda x: str(x), view_point.nw_quaternion)))

    element_attribute_pairs = (
        (view, view_attributes),
        (pos3f, pos3f_attributes),
        (quaternion, quaternion_attributes),
    )
    for element, attributes in element_attribute_pairs:
        for attribute, value in attributes:
            element.set(attribute, value)

    return view

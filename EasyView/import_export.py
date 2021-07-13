import os
import uuid
import math
import xml.etree.ElementTree as ET  # FIXME replace with defusedXML
from xml.etree.ElementTree import Element

from django.core.exceptions import ObjectDoesNotExist
from django.core.files.uploadedfile import InMemoryUploadedFile

from AtomREST.settings import BASE_DIR
from EasyView.models import ViewPoint, Model3D


def create_exported_viewpoints_xml(pk_list: list) -> ET:
    """
    Function that makes XML files with view points, which can be used in Autodesk Navisworks.

    :param pk_list: list that contents primary keys of saved view points that should be exported.
    Keys can be str or int.

    :return: Element Tree with inserted view points
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
    # View point - fov, position and rotation
    camera = view[0][0]
    pos3f = camera[0][0]
    quaternion = camera[1][0]

    camera_attributes = (
        ('height', str(math.radians(view_point.fov))),
    )
    view_attributes = (
        ('guid', str(uuid.uuid4())),
        ('name', view_point.description)  # FIXME insert generated name if no description
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
        (camera, camera_attributes),
        (view, view_attributes),
        (pos3f, pos3f_attributes),
        (quaternion, quaternion_attributes),
    )
    for element, attributes in element_attribute_pairs:
        for attribute, value in attributes:
            element.set(attribute, value)

    return view


def import_navisworks_viewpoints(xml_file: InMemoryUploadedFile, model_pk: int) -> list:
    """
    The function parses an uploaded file with Navisworks view points and tries to save them.
    :param xml_file: an XML file with viewpoints, opened to read.
    :param model_pk: PK of a model the viewpoints should be saved to.
    :return: list of successfully saved viewpoints' PKs.
    """
    viewpoints_pks_list = []
    with xml_file.open('r') as xml:  # ValueError
        viewpoints_tree = ET.parse(xml)  # ParseError
        view_points = viewpoints_tree.getroot()[0]  # IndexError
        for view_point in view_points:
            viewpoint_object = import_viewpoint(view_point)  # can throw a lot of things
            viewpoint_object.model = Model3D.objects.get(pk=model_pk)
            viewpoint_object.save()
            viewpoints_pks_list.append(viewpoint_object.pk)
    return viewpoints_pks_list


def import_viewpoint(view_point: Element) -> ViewPoint:
    """
    The function tries to parse single view point off given element
    :param view_point: XML element with information about a viewpoint
    :return: viewpoint object
    """
    description = view_point.get('name')
    position = [float(view_point[0][0][0][0].get(key)) for key in ['x', 'y', 'z']]  # IndexError, ValueError
    quaternion = [float(view_point[0][0][1][0].get(key)) for key in ['a', 'b', 'c', 'd']]  # IndexError, ValueError
    fov = math.degrees(float(view_point[0][0].get('height')))  # IndexError, ValueError
    clip_constants_status = [False] * 6
    clip_constants = [0.0] * 6
    has_clipping = False
    clip_planes = view_point[1][1]  # IndexError
    if len(clip_planes) != 6:
        raise ValueError('Неверное число секущих плоскостей в файле')
    for i, clip_plane in enumerate(clip_planes):
        plane_state = clip_plane.get('state') == 'enabled'
        if plane_state:
            if not has_clipping:
                has_clipping = True
            clip_constants_status[i] = plane_state
            clip_constants[i] = float(clip_plane[0].get('distance'))  # ValueError
    if not has_clipping:
        clip_constants_status, clip_constants = None, None
    viewpoint_object = ViewPoint(
        description=description,
        position=position,
        quaternion=quaternion,
        fov=fov,
        clip_constants_status=clip_constants_status,
        clip_constants=clip_constants,
    )
    return viewpoint_object

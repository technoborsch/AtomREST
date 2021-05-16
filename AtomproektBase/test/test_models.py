from django.test import TestCase
from AtomproektBase import models


class SetUp(TestCase):
    """Base setup for all test cases"""
    def setUp(self) -> None:
        self.project1 = models.Project.objects.create(
            name="Суперстанция-1",
            country="Utopia",
            description="A fancy NPP",
            stage="forever")
        self.project2 = models.Project.objects.create(
            name="Сверхстанция-2",
            country="Narnia",
            description="The fanciest NPP",
            stage="ever")
        self.building1_1 = models.Building.objects.create(
            kks='10UJA',
            name='Reactor building',
            project=self.project1)
        self.building1_2 = models.Building.objects.create(
            kks='10UKA',
            name='Auxiliary building',
            project=self.project1)
        self.system1_1 = models.System.objects.create(
            kks='10JRT',
            name='Have_no_idea',
            project=self.project1,
            seismic_category='1',
            safety_category='1')
        self.system1_1.buildings.add(self.building1_1)
        self.system1_2 = models.System.objects.create(
            kks='10KAA',
            name='Cooler',
            project=self.project1,
            seismic_category='1',
            safety_category='2')
        self.system1_2.buildings.add(self.building1_1)
        self.system1_2.buildings.add(self.building1_2)
        self.clean_all()

    def clean_all(self):
        """Full-clean all self-models"""
        for item in self.__dict__:
            if hasattr(item, 'full_clean'):
                item.full_clean()


class SlugBaseTest(SetUp):
    """Tests for a base that adds slug field"""
    def testRaises(self):
        """Tests if it raises errors as expected"""
        cases = ['', 'field_that_doesnt_exist']  # should trigger error
        for case in cases:
            with self.subTest(msg=case):
                with self.assertRaises(ValueError):
                    test_model_class = type(
                        'TestModel' + case, (models.SlugBase,),
                        {
                            'field_to_slugify': case,
                            '__module__': __name__,
                        })
                    test_obj = test_model_class()
                    test_obj.save()


class ProjectTest(SetUp):
    """Tests for project model"""

    def test_slug(self):
        """Checks if slug for model is correct"""
        cases = [
            (self.project1, "superstantsiya-1"),
            (self.project2, "sverhstantsiya-2"),
        ]
        for project, slug in cases:
            with self.subTest(msg=str(project)):
                self.assertEqual(project.slug, slug)

    def test_order(self):
        """Checks correct ordering of objects"""

        self.assertEqual(
            list(models.Project.objects.all()),
            [self.project1, self.project2]
        )


class BuildingTest(SetUp):
    """Tests for building model"""

    def test_slug(self):
        """Checks if slug for model is correct"""
        cases = [
            (self.building1_1, "10uja"),
            (self.building1_2, "10uka"),
        ]
        for project, slug in cases:
            with self.subTest(msg=str(project)):
                self.assertEqual(project.slug, slug)


class SystemTest(SetUp):
    """Tests for system model"""

    def test_slug(self):
        """Checks if slug for model is correct"""
        cases = [
            (self.system1_1, "10jrt"),
            (self.system1_2, "10kaa"),
        ]
        for project, slug in cases:
            with self.subTest(msg=str(project)):
                self.assertEqual(project.slug, slug)

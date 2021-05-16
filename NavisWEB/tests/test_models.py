from AtomproektBase.test.test_models import SetUp

from NavisWEB import models


class Model3DTest(SetUp):
    """Tests for a three-dimensional model"""
    def setUp(self) -> None:
        super(Model3DTest, self).setUp()
        self.model1 = models.Model3D(
            building=self.building1_1,
        )
        self.clean_all()

    def test_upload_path(self):
        """Checks the filepath for a model"""
        self.assertEqual(models.get_upload_path(self.model1, '10UGB.nwd'), 'models/10uja/10UGB.nwd')

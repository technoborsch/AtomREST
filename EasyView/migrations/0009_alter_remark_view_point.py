# Generated by Django 3.2.2 on 2021-07-06 12:11

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('EasyView', '0008_viewpoint_fov'),
    ]

    operations = [
        migrations.AlterField(
            model_name='remark',
            name='view_point',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='remark', to='EasyView.viewpoint'),
        ),
    ]
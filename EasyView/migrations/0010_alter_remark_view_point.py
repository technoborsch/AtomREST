# Generated by Django 3.2.2 on 2021-07-08 09:50

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('EasyView', '0009_alter_remark_view_point'),
    ]

    operations = [
        migrations.AlterField(
            model_name='remark',
            name='view_point',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='remark', to='EasyView.viewpoint'),
        ),
    ]


from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('registry', '0011_membershiprequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='batch',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='students', to='registry.academicbatch'),
        ),
        migrations.AddField(
            model_name='user',
            name='course',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='course_students', to='registry.course'),
        ),
        migrations.AddField(
            model_name='membershiprequest',
            name='course',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='registry.course'),
        ),
    ]

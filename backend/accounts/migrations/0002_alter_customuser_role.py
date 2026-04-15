from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Admin'),
                    ('agent', 'Agent'),
                    ('underwriter', 'Underwriter'),
                    ('credit_manager', 'Credit Manager'),
                    ('finance', 'Finance'),
                    ('operations', 'Operations'),
                    ('compliance_officer', 'Compliance Officer'),
                    ('customer', 'Customer'),
                ],
                default='agent',
                max_length=20,
            ),
        ),
    ]

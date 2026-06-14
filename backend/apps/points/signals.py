from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import PointAccount


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_point_account(sender, instance, created, **kwargs):
    if created:
        PointAccount.objects.create(user=instance)

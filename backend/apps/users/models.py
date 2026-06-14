from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    GENDER_CHOICES = [
        (0, '未知'),
        (1, '男'),
        (2, '女'),
    ]

    ROLE_CHOICES = [
        ('resident', '居民'),
        ('collector', '收集员'),
        ('inspector', '巡检员'),
        ('admin', '管理员'),
    ]

    phone = models.CharField(max_length=20, unique=True, verbose_name='手机号')
    nickname = models.CharField(max_length=50, blank=True, default='', verbose_name='昵称')
    avatar = models.CharField(max_length=255, blank=True, default='', verbose_name='头像')
    gender = models.SmallIntegerField(choices=GENDER_CHOICES, default=0, verbose_name='性别')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='resident', verbose_name='角色')
    id_card_no = models.CharField(max_length=18, blank=True, default='', verbose_name='身份证号')
    identity_code = models.CharField(max_length=50, unique=True, blank=True, null=True, verbose_name='身份码')
    community = models.CharField(max_length=100, blank=True, default='', verbose_name='所属社区')
    address = models.CharField(max_length=255, blank=True, default='', verbose_name='详细地址')
    total_points = models.IntegerField(default=0, verbose_name='累计积分')
    available_points = models.IntegerField(default=0, verbose_name='可用积分')
    status = models.BooleanField(default=True, verbose_name='状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'gt_user'
        verbose_name = '用户'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.username}({self.phone})'

    def save(self, *args, **kwargs):
        if not self.nickname:
            self.nickname = f'绿友{self.phone[-4:]}' if self.phone else '绿友'
        super().save(*args, **kwargs)

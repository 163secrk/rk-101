import uuid
import hashlib
import hmac
import base64
import json
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import models
from django.conf import settings


class GreenPassCode(models.Model):
    STATUS_CHOICES = [
        (0, '未使用'),
        (1, '已使用'),
        (2, '已过期'),
        (3, '已作废'),
    ]

    code_id = models.UUIDField(default=uuid.uuid4, unique=True, verbose_name='通行码ID')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='pass_codes', verbose_name='用户')
    encrypted_data = models.TextField(verbose_name='加密数据')
    signature = models.CharField(max_length=256, verbose_name='签名')
    expires_at = models.DateTimeField(verbose_name='过期时间')
    status = models.SmallIntegerField(choices=STATUS_CHOICES, default=0, verbose_name='状态')
    used_at = models.DateTimeField(null=True, blank=True, verbose_name='使用时间')
    used_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='verified_codes', verbose_name='验证人')
    bin_code = models.CharField(max_length=50, blank=True, default='', verbose_name='关联投放点编号')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'gt_green_pass_code'
        verbose_name = '绿色通行码'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.nickname} - {self.code_id}'

    @classmethod
    def generate_code(cls, user, valid_minutes=5):
        code_id = uuid.uuid4()
        now = timezone.now()
        expires_at = now + timedelta(minutes=valid_minutes)

        payload = {
            'code_id': str(code_id),
            'user_id': user.id,
            'username': user.username,
            'nickname': user.nickname,
            'role': user.role,
            'identity_code': user.identity_code or '',
            'community': user.community or '',
            'created_at': now.isoformat(),
            'expires_at': expires_at.isoformat(),
            'nonce': uuid.uuid4().hex[:8],
        }

        payload_json = json.dumps(payload, separators=(',', ':'), ensure_ascii=False)
        encrypted = base64.urlsafe_b64encode(payload_json.encode('utf-8')).decode('utf-8')

        secret_key = settings.SECRET_KEY.encode('utf-8')
        signature = hmac.new(secret_key, encrypted.encode('utf-8'), hashlib.sha256).hexdigest()

        pass_code = cls.objects.create(
            code_id=code_id,
            user=user,
            encrypted_data=encrypted,
            signature=signature,
            expires_at=expires_at,
        )

        qr_content = f'{encrypted}.{signature}'
        return pass_code, qr_content

    @classmethod
    def verify_code(cls, qr_content, verifier=None):
        try:
            parts = qr_content.split('.')
            if len(parts) != 2:
                return False, '通行码格式错误'

            encrypted_data, signature = parts

            secret_key = settings.SECRET_KEY.encode('utf-8')
            expected_signature = hmac.new(secret_key, encrypted_data.encode('utf-8'), hashlib.sha256).hexdigest()

            if not hmac.compare_digest(expected_signature, signature):
                return False, '通行码签名验证失败'

            payload_json = base64.urlsafe_b64decode(encrypted_data.encode('utf-8')).decode('utf-8')
            payload = json.loads(payload_json)

            expires_at = datetime.fromisoformat(payload['expires_at'])
            if timezone.now() > expires_at:
                return False, '通行码已过期'

            try:
                pass_code = cls.objects.get(code_id=payload['code_id'])
            except cls.DoesNotExist:
                return False, '通行码不存在'

            if pass_code.status != 0:
                status_map = {1: '已使用', 2: '已过期', 3: '已作废'}
                return False, f'通行码{status_map.get(pass_code.status, "状态异常")}'

            if pass_code.user_id != payload['user_id']:
                return False, '通行码用户信息不匹配'

            pass_code.status = 1
            pass_code.used_at = timezone.now()
            if verifier:
                pass_code.used_by = verifier
            pass_code.save()

            return True, {
                'pass_code': pass_code,
                'payload': payload,
            }

        except Exception as e:
            return False, f'验证失败: {str(e)}'


class PointAccount(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='point_account', verbose_name='用户')
    total_earned = models.IntegerField(default=0, verbose_name='累计获得')
    total_spent = models.IntegerField(default=0, verbose_name='累计消费')
    total_expired = models.IntegerField(default=0, verbose_name='累计过期')
    balance = models.IntegerField(default=0, verbose_name='当前余额')
    frozen = models.IntegerField(default=0, verbose_name='冻结积分')
    level = models.SmallIntegerField(default=1, verbose_name='用户等级')
    level_name = models.CharField(max_length=20, default='环保新手', verbose_name='等级名称')
    next_level_points = models.IntegerField(default=1000, verbose_name='下一等级所需积分')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'gt_point_account'
        verbose_name = '积分账户'
        verbose_name_plural = verbose_name

    def __str__(self):
        return f'{self.user.nickname} - 余额:{self.balance}'


class PointRecord(models.Model):
    TYPE_CHOICES = [
        ('earn', '获得'),
        ('spend', '消费'),
        ('expire', '过期'),
        ('adjust', '调整'),
    ]

    SOURCE_CHOICES = [
        ('delivery', '投放垃圾'),
        ('exchange', '积分兑换'),
        ('achievement', '成就奖励'),
        ('activity', '活动奖励'),
        ('system', '系统调整'),
        ('manual', '人工调整'),
    ]

    account = models.ForeignKey(PointAccount, on_delete=models.CASCADE, related_name='records', verbose_name='积分账户')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='point_records', verbose_name='用户')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name='类型')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, verbose_name='来源')
    points = models.IntegerField(verbose_name='积分数值(正数增加,负数减少)')
    balance_before = models.IntegerField(verbose_name='变动前余额')
    balance_after = models.IntegerField(verbose_name='变动后余额')
    related_id = models.CharField(max_length=50, blank=True, default='', verbose_name='关联业务ID')
    remark = models.CharField(max_length=255, blank=True, default='', verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'gt_point_record'
        verbose_name = '积分流水'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.nickname} {self.type} {self.points}'


class SmartBin(models.Model):
    STATUS_CHOICES = [
        (0, '离线'),
        (1, '在线'),
        (2, '维护中'),
        (3, '故障'),
    ]

    CATEGORY_CHOICES = [
        ('recyclable', '可回收物'),
        ('kitchen', '厨余垃圾'),
        ('hazardous', '有害垃圾'),
        ('other', '其他垃圾'),
        ('mixed', '混合投放'),
    ]

    bin_code = models.CharField(max_length=50, unique=True, verbose_name='设备编号')
    name = models.CharField(max_length=100, verbose_name='站点名称')
    location = models.CharField(max_length=255, verbose_name='安装地址')
    community = models.CharField(max_length=100, blank=True, default='', verbose_name='所属社区')
    longitude = models.FloatField(null=True, blank=True, verbose_name='经度')
    latitude = models.FloatField(null=True, blank=True, verbose_name='纬度')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='mixed', verbose_name='垃圾类型')
    status = models.SmallIntegerField(choices=STATUS_CHOICES, default=1, verbose_name='状态')
    capacity = models.FloatField(default=100.0, verbose_name='容量上限(L)')
    used = models.FloatField(default=0.0, verbose_name='已使用(L)')
    last_online = models.DateTimeField(null=True, blank=True, verbose_name='最后在线时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'gt_smart_bin'
        verbose_name = '智能投放点'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name}({self.bin_code})'


class DeliveryRecord(models.Model):
    CATEGORY_CHOICES = [
        ('recyclable', '可回收物'),
        ('kitchen', '厨余垃圾'),
        ('hazardous', '有害垃圾'),
        ('other', '其他垃圾'),
    ]

    STATUS_CHOICES = [
        (0, '待审核'),
        (1, '已完成'),
        (2, '异常'),
        (3, '已驳回'),
    ]

    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='deliveries', verbose_name='用户')
    bin = models.ForeignKey(SmartBin, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries', verbose_name='投放点')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name='垃圾分类')
    weight = models.FloatField(verbose_name='重量(kg)')
    points_earned = models.IntegerField(default=0, verbose_name='获得积分')
    points_per_kg = models.FloatField(default=0, verbose_name='每公斤积分')
    status = models.SmallIntegerField(choices=STATUS_CHOICES, default=1, verbose_name='状态')
    image = models.CharField(max_length=255, blank=True, default='', verbose_name='投放照片')
    inspector_id = models.BigIntegerField(null=True, blank=True, verbose_name='巡检员ID')
    inspection_remark = models.CharField(max_length=255, blank=True, default='', verbose_name='巡检备注')
    point_record = models.OneToOneField(PointRecord, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='积分流水')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='投放时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'gt_delivery_record'
        verbose_name = '投放记录'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.nickname} {self.category} {self.weight}kg'


class ExchangeGoods(models.Model):
    STATUS_CHOICES = [
        (0, '下架'),
        (1, '上架'),
    ]

    goods_code = models.CharField(max_length=50, unique=True, verbose_name='商品编号')
    name = models.CharField(max_length=100, verbose_name='商品名称')
    description = models.TextField(blank=True, default='', verbose_name='商品描述')
    image = models.CharField(max_length=255, blank=True, default='', verbose_name='商品图片')
    points_price = models.IntegerField(verbose_name='积分价格')
    market_price = models.FloatField(default=0, verbose_name='市场价格')
    stock = models.IntegerField(default=0, verbose_name='库存')
    sold = models.IntegerField(default=0, verbose_name='已售数量')
    status = models.SmallIntegerField(choices=STATUS_CHOICES, default=1, verbose_name='状态')
    category = models.CharField(max_length=50, blank=True, default='', verbose_name='商品分类')
    sort = models.IntegerField(default=0, verbose_name='排序')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'gt_exchange_goods'
        verbose_name = '兑换商品'
        verbose_name_plural = verbose_name
        ordering = ['sort', '-created_at']

    def __str__(self):
        return f'{self.name}({self.points_price}积分)'


class ExchangeOrder(models.Model):
    STATUS_CHOICES = [
        (0, '待发货'),
        (1, '已发货'),
        (2, '已完成'),
        (3, '已取消'),
        (4, '待领取'),
    ]

    order_no = models.CharField(max_length=50, unique=True, verbose_name='订单号')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='exchange_orders', verbose_name='用户')
    goods = models.ForeignKey(ExchangeGoods, on_delete=models.CASCADE, related_name='orders', verbose_name='商品')
    goods_name = models.CharField(max_length=100, verbose_name='商品名称快照')
    goods_image = models.CharField(max_length=255, blank=True, default='', verbose_name='商品图片快照')
    quantity = models.IntegerField(default=1, verbose_name='数量')
    total_points = models.IntegerField(verbose_name='消耗总积分')
    status = models.SmallIntegerField(choices=STATUS_CHOICES, default=0, verbose_name='状态')
    receiver_name = models.CharField(max_length=50, blank=True, default='', verbose_name='收货人')
    receiver_phone = models.CharField(max_length=20, blank=True, default='', verbose_name='收货电话')
    receiver_address = models.CharField(max_length=255, blank=True, default='', verbose_name='收货地址')
    logistics_no = models.CharField(max_length=50, blank=True, default='', verbose_name='物流单号')
    logistics_company = models.CharField(max_length=50, blank=True, default='', verbose_name='物流公司')
    point_record = models.OneToOneField(PointRecord, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='积分流水')
    remark = models.CharField(max_length=255, blank=True, default='', verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'gt_exchange_order'
        verbose_name = '兑换订单'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order_no}'


class Achievement(models.Model):
    CATEGORY_CHOICES = [
        ('delivery', '投放达人'),
        ('points', '积分王者'),
        ('streak', '连续挑战'),
        ('special', '特殊成就'),
    ]

    code = models.CharField(max_length=50, unique=True, verbose_name='成就编码')
    name = models.CharField(max_length=50, verbose_name='成就名称')
    description = models.CharField(max_length=255, verbose_name='成就描述')
    icon = models.CharField(max_length=255, blank=True, default='', verbose_name='成就图标')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name='分类')
    points_reward = models.IntegerField(default=0, verbose_name='奖励积分')
    condition_type = models.CharField(max_length=50, verbose_name='条件类型')
    condition_value = models.IntegerField(default=0, verbose_name='条件值')
    rarity = models.SmallIntegerField(default=1, verbose_name='稀有度 1-5')
    sort = models.IntegerField(default=0, verbose_name='排序')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'gt_achievement'
        verbose_name = '绿色成就'
        verbose_name_plural = verbose_name
        ordering = ['sort', 'id']

    def __str__(self):
        return self.name


class UserAchievement(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='achievements', verbose_name='用户')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name='users', verbose_name='成就')
    unlocked_at = models.DateTimeField(auto_now_add=True, verbose_name='解锁时间')
    is_new = models.BooleanField(default=True, verbose_name='是否新解锁')

    class Meta:
        db_table = 'gt_user_achievement'
        verbose_name = '用户成就'
        verbose_name_plural = verbose_name
        unique_together = [['user', 'achievement']]
        ordering = ['-unlocked_at']

    def __str__(self):
        return f'{self.user.nickname} - {self.achievement.name}'


class InspectionReport(models.Model):
    TYPE_CHOICES = [
        ('wrong_category', '分类错误'),
        ('bin_full', '投放点满溢'),
        ('bin_damage', '设备损坏'),
        ('hygiene', '卫生问题'),
        ('other', '其他'),
    ]

    STATUS_CHOICES = [
        (0, '待处理'),
        (1, '处理中'),
        (2, '已处理'),
        (3, '已驳回'),
    ]

    reporter = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='reported_inspections', verbose_name='上报人')
    handler = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_inspections', verbose_name='处理人')
    bin = models.ForeignKey(SmartBin, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspections', verbose_name='关联投放点')
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, verbose_name='异常类型')
    description = models.TextField(verbose_name='异常描述')
    images = models.JSONField(default=list, blank=True, verbose_name='照片列表')
    location = models.CharField(max_length=255, blank=True, default='', verbose_name='位置')
    status = models.SmallIntegerField(choices=STATUS_CHOICES, default=0, verbose_name='状态')
    handle_remark = models.TextField(blank=True, default='', verbose_name='处理备注')
    points_reward = models.IntegerField(default=0, verbose_name='奖励积分')
    point_record = models.OneToOneField(PointRecord, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='积分流水')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='上报时间')
    handled_at = models.DateTimeField(null=True, blank=True, verbose_name='处理时间')

    class Meta:
        db_table = 'gt_inspection_report'
        verbose_name = '巡检异常上报'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.type} - {self.status}'

from rest_framework import serializers
from .models import GreenPassCode, PointAccount, PointRecord, DeliveryRecord, SmartBin


class GreenPassCodeSerializer(serializers.ModelSerializer):
    qr_content = serializers.SerializerMethodField()
    expires_in = serializers.SerializerMethodField()
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = GreenPassCode
        fields = ['code_id', 'status', 'expires_at', 'created_at', 'qr_content', 'expires_in', 'user_info']
        read_only_fields = ['code_id', 'status', 'expires_at', 'created_at', 'qr_content', 'expires_in', 'user_info']

    def get_qr_content(self, obj):
        return f'{obj.encrypted_data}.{obj.signature}'

    def get_expires_in(self, obj):
        from django.utils import timezone
        now = timezone.now()
        if obj.expires_at > now:
            delta = obj.expires_at - now
            return int(delta.total_seconds())
        return 0

    def get_user_info(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'username': user.username,
            'nickname': user.nickname,
            'avatar': user.avatar,
            'role': user.role,
            'community': user.community,
        }


class PassCodeVerifySerializer(serializers.Serializer):
    qr_content = serializers.CharField(required=True, error_messages={
        'required': '请提供通行码内容'
    })
    bin_code = serializers.CharField(required=False, allow_blank=True, default='')


class PointAccountSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField()

    class Meta:
        model = PointAccount
        fields = '__all__'
        read_only_fields = ['user', 'total_earned', 'total_spent', 'total_expired',
                            'balance', 'frozen', 'level', 'level_name',
                            'next_level_points', 'created_at', 'updated_at']

    def get_user_info(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'username': user.username,
            'nickname': user.nickname,
            'avatar': user.avatar,
            'phone': user.phone,
        }


class PointRecordSerializer(serializers.ModelSerializer):
    type_name = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()

    class Meta:
        model = PointRecord
        fields = '__all__'

    def get_type_name(self, obj):
        return obj.get_type_display()

    def get_source_name(self, obj):
        return obj.get_source_display()


class DeliveryAuditSerializer(serializers.Serializer):
    ACTION_CHOICES = [
        ('approve', '审核通过'),
        ('reject', '驳回'),
    ]
    action = serializers.ChoiceField(choices=ACTION_CHOICES, required=True, error_messages={
        'required': '请选择审核操作',
        'invalid_choice': '无效的审核操作'
    })
    remark = serializers.CharField(required=False, allow_blank=True, default='', max_length=255)


class DeliveryRecordSerializer(serializers.ModelSerializer):
    bin_info = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    status_name = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryRecord
        fields = '__all__'
        read_only_fields = ['user', 'points_earned', 'points_per_kg', 'status', 'point_record']

    def get_bin_info(self, obj):
        if obj.bin:
            return {
                'id': obj.bin.id,
                'bin_code': obj.bin.bin_code,
                'name': obj.bin.name,
                'location': obj.bin.location,
            }
        return None

    def get_category_name(self, obj):
        return obj.get_category_display()

    def get_status_name(self, obj):
        return obj.get_status_display()


class DeliveryCreateSerializer(serializers.Serializer):
    bin_id = serializers.IntegerField(required=True, error_messages={
        'required': '请选择投放点'
    })
    category = serializers.ChoiceField(
        choices=DeliveryRecord.CATEGORY_CHOICES,
        required=True,
        error_messages={'required': '请选择垃圾类别'}
    )
    weight = serializers.FloatField(required=True, min_value=0.1, error_messages={
        'required': '请输入投放重量',
        'min_value': '投放重量不能小于0.1kg'
    })

    def validate(self, attrs):
        from .models import SmartBin

        bin_id = attrs.get('bin_id')
        category = attrs.get('category')
        weight = attrs.get('weight')

        try:
            bin_obj = SmartBin.objects.get(pk=bin_id)
        except SmartBin.DoesNotExist:
            raise serializers.ValidationError({'bin_id': '投放点不存在'})

        if bin_obj.status != 1:
            status_map = {0: '离线', 2: '维护中', 3: '故障'}
            raise serializers.ValidationError({
                'bin_id': '投放点当前{}，无法投放'.format(status_map.get(bin_obj.status, '状态异常'))
            })

        if bin_obj.category != 'mixed' and bin_obj.category != category:
            category_map = dict(SmartBin.CATEGORY_CHOICES)
            raise serializers.ValidationError({
                'category': '该投放点仅支持投放【{}】，请选择正确的垃圾类别'.format(
                    category_map.get(bin_obj.category, bin_obj.category)
                )
            })

        remaining = bin_obj.capacity - bin_obj.used
        if weight > remaining:
            raise serializers.ValidationError({
                'weight': '投放点容量不足，剩余容量约 {:.1f}kg，请减少投放重量'.format(remaining)
            })

        attrs['bin_obj'] = bin_obj
        return attrs


class SmartBinSerializer(serializers.ModelSerializer):
    status_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    usage_rate = serializers.SerializerMethodField()

    class Meta:
        model = SmartBin
        fields = '__all__'

    def get_status_name(self, obj):
        return obj.get_status_display()

    def get_category_name(self, obj):
        return obj.get_category_display()

    def get_usage_rate(self, obj):
        if obj.capacity > 0:
            return round(obj.used / obj.capacity * 100, 1)
        return 0

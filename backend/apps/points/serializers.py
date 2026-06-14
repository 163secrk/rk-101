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
    class Meta:
        model = PointAccount
        fields = '__all__'


class PointRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointRecord
        fields = '__all__'


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

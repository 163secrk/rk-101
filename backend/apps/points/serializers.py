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
        from datetime import datetime
        now = datetime.now()
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
    class Meta:
        model = DeliveryRecord
        fields = '__all__'


class SmartBinSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmartBin
        fields = '__all__'

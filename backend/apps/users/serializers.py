import re
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, error_messages={
        'min_length': '密码长度至少6位'
    })
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'phone', 'password', 'confirm_password', 'email', 'nickname', 'community', 'address']
        extra_kwargs = {
            'username': {'min_length': 3, 'max_length': 20},
            'phone': {'required': True},
            'email': {'required': False, 'allow_blank': True},
        }

    def validate_username(self, value):
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', value):
            raise serializers.ValidationError('用户名只能包含字母、数字和下划线，长度3-20位')
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('用户名已被注册')
        return value

    def validate_phone(self, value):
        if not re.match(r'^1[3-9]\d{9}$', value):
            raise serializers.ValidationError('请输入正确的手机号')
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError('手机号已被注册')
        return value

    def validate_email(self, value):
        if value and not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
            raise serializers.ValidationError('邮箱格式不正确')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': '两次输入的密码不一致'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        username = attrs.get('username', '').strip()
        phone = attrs.get('phone', '').strip()
        password = attrs.get('password')

        if not username and not phone:
            raise serializers.ValidationError('请输入用户名或手机号')

        user = None
        if username:
            user = authenticate(request=self.context.get('request'), username=username, password=password)
        if not user and phone:
            try:
                user_obj = User.objects.get(phone=phone)
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                pass

        if not user:
            raise serializers.ValidationError('账号或密码错误')

        if not user.status:
            raise serializers.ValidationError('账号已被禁用')

        refresh = RefreshToken.for_user(user)
        attrs['user'] = user
        attrs['tokens'] = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
        return attrs


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'phone', 'email', 'nickname', 'avatar', 'gender', 'role',
                  'identity_code', 'community', 'address', 'total_points', 'available_points',
                  'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'identity_code', 'total_points', 'available_points',
                            'status', 'created_at', 'updated_at']


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'phone', 'email', 'nickname', 'avatar', 'gender',
                  'identity_code', 'community', 'address', 'total_points', 'available_points',
                  'role', 'created_at']
        read_only_fields = ['id', 'username', 'phone', 'identity_code', 'total_points',
                            'available_points', 'role', 'created_at']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, required=True, min_length=6)

    def validate_new_password(self, value):
        if not re.match(r'^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};\'":\\|,.<>\/?]{6,}$', value):
            raise serializers.ValidationError('密码格式不合法')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': '两次输入的新密码不一致'})
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': '新密码不能与旧密码相同'})
        return attrs

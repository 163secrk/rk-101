import re
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, InvitationCode


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, error_messages={
        'min_length': '密码长度至少6位'
    })
    confirm_password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False, default='resident')
    invitation_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'phone', 'password', 'confirm_password', 'email', 'nickname', 'community', 'address', 'role', 'invitation_code']
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

        role = attrs.get('role', 'resident')
        invitation_code = attrs.get('invitation_code', '')

        if role in ['admin', 'inspector', 'collector']:
            if not invitation_code:
                raise serializers.ValidationError({'invitation_code': '注册该角色需要邀请码'})
            
            try:
                code_obj = InvitationCode.objects.get(code=invitation_code)
            except InvitationCode.DoesNotExist:
                raise serializers.ValidationError({'invitation_code': '邀请码不存在'})

            if code_obj.role != role:
                raise serializers.ValidationError({'invitation_code': f'邀请码与注册角色不匹配，该邀请码仅用于注册{code_obj.get_role_display()}'})

            if not code_obj.is_valid():
                if code_obj.is_used:
                    raise serializers.ValidationError({'invitation_code': '邀请码已被使用'})
                elif code_obj.expires_at <= timezone.now():
                    raise serializers.ValidationError({'invitation_code': '邀请码已过期'})

            attrs['_invitation_code_obj'] = code_obj

        elif role == 'resident':
            pass
        else:
            raise serializers.ValidationError({'role': '无效的角色类型'})

        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        invitation_code_obj = validated_data.pop('_invitation_code_obj', None)
        validated_data.pop('invitation_code', None)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        if invitation_code_obj:
            invitation_code_obj.is_used = True
            invitation_code_obj.used_by = user
            invitation_code_obj.used_at = timezone.now()
            invitation_code_obj.save()

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


class InvitationCodeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    used_by_name = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = InvitationCode
        fields = ['id', 'code', 'role', 'created_by', 'created_by_name', 'used_by', 'used_by_name',
                  'is_used', 'expires_at', 'created_at', 'used_at', 'is_valid']
        read_only_fields = ['id', 'created_by', 'created_by_name', 'used_by', 'used_by_name',
                            'is_used', 'created_at', 'used_at', 'is_valid']

    def get_created_by_name(self, obj):
        return obj.created_by.nickname if obj.created_by else None

    def get_used_by_name(self, obj):
        return obj.used_by.nickname if obj.used_by else None

    def get_is_valid(self, obj):
        return obj.is_valid()


class InvitationCodeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvitationCode
        fields = ['code', 'role', 'expires_at']
        extra_kwargs = {
            'code': {'required': True},
            'role': {'required': True},
            'expires_at': {'required': True},
        }

    def validate_code(self, value):
        if InvitationCode.objects.filter(code=value).exists():
            raise serializers.ValidationError('邀请码已存在')
        return value

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

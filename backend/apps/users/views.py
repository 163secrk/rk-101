from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    UserProfileSerializer, ChangePasswordSerializer,
    InvitationCodeSerializer, InvitationCodeCreateSerializer
)
from .models import User, InvitationCode


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        data = {
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }
        return Response({
            'code': 0,
            'message': '注册成功',
            'data': data
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = serializer.validated_data['tokens']
        data = {
            'user': UserSerializer(user).data,
            'tokens': tokens
        }
        return Response({
            'code': 0,
            'message': '登录成功',
            'data': data
        })


class TokenRefreshWrapView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return Response({
            'code': 0,
            'message': '刷新成功',
            'data': response.data
        })


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': serializer.data
        })

    def put(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'code': 0,
            'message': '更新成功',
            'data': serializer.data
        })


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({
                'code': 400,
                'message': '原密码错误',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({
            'code': 0,
            'message': '密码修改成功',
            'data': None
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({
            'code': 0,
            'message': '退出成功',
            'data': None
        })


class InvitationCodeListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = InvitationCode.objects.all()
    serializer_class = InvitationCodeSerializer

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InvitationCodeCreateSerializer
        return InvitationCodeSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': serializer.data
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            'code': 0,
            'message': '创建成功',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)


class InvitationCodeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = InvitationCode.objects.all()
    serializer_class = InvitationCodeSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_used:
            return Response({
                'code': 400,
                'message': '已使用的邀请码无法删除',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        self.perform_destroy(instance)
        return Response({
            'code': 0,
            'message': '删除成功',
            'data': None
        })

    def update(self, request, *args, **kwargs):
        return Response({
            'code': 405,
            'message': '不支持修改邀请码',
            'data': None
        }, status=status.HTTP_405_METHOD_NOT_ALLOWED)

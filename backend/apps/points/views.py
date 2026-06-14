from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics
from .models import GreenPassCode
from .serializers import GreenPassCodeSerializer, PassCodeVerifySerializer
from rest_framework.permissions import BasePermission


class IsResident(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['resident', 'admin']


class IsInspector(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['inspector', 'admin']


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class HomeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'user': {
                'nickname': user.nickname,
                'avatar': user.avatar,
                'available_points': user.available_points,
                'total_points': user.total_points,
            },
            'stats': {
                'total_deliveries': 0,
                'monthly_deliveries': 0,
                'total_weight': 0,
                'co2_reduction': 0,
            },
            'quick_actions': [
                {'key': 'delivery', 'name': '投放垃圾', 'icon': 'IconUpload'},
                {'key': 'scan', 'name': '扫码投放', 'icon': 'IconScan'},
                {'key': 'exchange', 'name': '积分兑换', 'icon': 'IconGift'},
                {'key': 'achievement', 'name': '绿色成就', 'icon': 'IconTrophy'},
            ]
        }
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': data
        })


class GeneratePassCodeView(APIView):
    permission_classes = [IsAuthenticated, IsResident]

    def post(self, request):
        user = request.user
        valid_minutes = request.data.get('valid_minutes', 5)
        try:
            valid_minutes = int(valid_minutes)
            if valid_minutes < 1 or valid_minutes > 60:
                valid_minutes = 5
        except (ValueError, TypeError):
            valid_minutes = 5

        pass_code, qr_content = GreenPassCode.generate_code(user, valid_minutes=valid_minutes)

        serializer = GreenPassCodeSerializer(pass_code)
        return Response({
            'code': 0,
            'message': '通行码生成成功',
            'data': serializer.data
        })


class VerifyPassCodeView(APIView):
    permission_classes = [IsAuthenticated, IsInspector]

    def post(self, request):
        serializer = PassCodeVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        qr_content = serializer.validated_data['qr_content']
        bin_code = serializer.validated_data.get('bin_code', '')

        success, result = GreenPassCode.verify_code(qr_content, verifier=request.user)

        if not success:
            return Response({
                'code': 400,
                'message': result,
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)

        pass_code = result['pass_code']
        payload = result['payload']

        if bin_code:
            pass_code.bin_code = bin_code
            pass_code.save()

        return Response({
            'code': 0,
            'message': '验证成功',
            'data': {
                'code_id': str(pass_code.code_id),
                'user': {
                    'id': payload['user_id'],
                    'username': payload['username'],
                    'nickname': payload['nickname'],
                    'role': payload['role'],
                    'identity_code': payload.get('identity_code', ''),
                    'community': payload.get('community', ''),
                },
                'created_at': payload['created_at'],
                'expires_at': payload['expires_at'],
                'verified_at': pass_code.used_at.isoformat() if pass_code.used_at else None,
            }
        })


class PassCodeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, code_id):
        try:
            pass_code = GreenPassCode.objects.get(code_id=code_id)
        except GreenPassCode.DoesNotExist:
            return Response({
                'code': 404,
                'message': '通行码不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'resident' and pass_code.user_id != request.user.id:
            return Response({
                'code': 403,
                'message': '无权查看此通行码',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = GreenPassCodeSerializer(pass_code)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': serializer.data
        })


class MyPassCodesView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsResident]
    serializer_class = GreenPassCodeSerializer

    def get_queryset(self):
        return GreenPassCode.objects.filter(user=self.request.user).order_by('-created_at')[:20]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': serializer.data,
                'total': queryset.count()
            }
        })

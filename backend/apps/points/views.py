from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics
from django.db import transaction
from django.utils import timezone
from .models import GreenPassCode, SmartBin, DeliveryRecord, PointAccount, PointRecord
from .serializers import (
    GreenPassCodeSerializer, PassCodeVerifySerializer,
    SmartBinSerializer, DeliveryRecordSerializer, DeliveryCreateSerializer
)
from rest_framework.permissions import BasePermission


POINTS_PER_KG = {
    'recyclable': 100,
    'kitchen': 50,
    'hazardous': 80,
    'other': 20,
}


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


class SmartBinListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SmartBinSerializer

    def get_queryset(self):
        queryset = SmartBin.objects.all().order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        keyword = self.request.query_params.get('keyword')
        if keyword:
            queryset = queryset.filter(name__icontains=keyword) | queryset.filter(location__icontains=keyword)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        total = queryset.count()
        queryset = queryset[start:end]
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': serializer.data,
                'total': total,
                'page': page,
                'page_size': page_size
            }
        })


class SmartBinCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = SmartBinSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            'code': 0,
            'message': '创建成功',
            'data': serializer.data
        })


class SmartBinDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            bin_obj = SmartBin.objects.get(pk=pk)
        except SmartBin.DoesNotExist:
            return Response({
                'code': 404,
                'message': '投放点不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        serializer = SmartBinSerializer(bin_obj)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': serializer.data
        })

    def put(self, request, pk):
        if not IsAdmin().has_permission(request, self):
            return Response({
                'code': 403,
                'message': '无权限操作',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        try:
            bin_obj = SmartBin.objects.get(pk=pk)
        except SmartBin.DoesNotExist:
            return Response({
                'code': 404,
                'message': '投放点不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        serializer = SmartBinSerializer(bin_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'code': 0,
            'message': '更新成功',
            'data': serializer.data
        })

    def delete(self, request, pk):
        if not IsAdmin().has_permission(request, self):
            return Response({
                'code': 403,
                'message': '无权限操作',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        try:
            bin_obj = SmartBin.objects.get(pk=pk)
        except SmartBin.DoesNotExist:
            return Response({
                'code': 404,
                'message': '投放点不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        bin_obj.delete()
        return Response({
            'code': 0,
            'message': '删除成功',
            'data': None
        })


class DeliveryListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DeliveryRecordSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            queryset = DeliveryRecord.objects.all()
        else:
            queryset = DeliveryRecord.objects.filter(user=user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        total = queryset.count()
        queryset = queryset[start:end]
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': serializer.data,
                'total': total,
                'page': page,
                'page_size': page_size
            }
        })


class DeliveryCreateView(APIView):
    permission_classes = [IsAuthenticated, IsResident]

    @transaction.atomic
    def post(self, request):
        serializer = DeliveryCreateSerializer(data=request.data)
        if not serializer.is_valid():
            errors = {}
            for field, messages in serializer.errors.items():
                errors[field] = messages[0] if messages else '参数错误'
            return Response({
                'code': 400,
                'message': '参数校验失败',
                'data': errors
            })
        data = serializer.validated_data

        bin_obj = data['bin_obj']

        points_per_kg = POINTS_PER_KG.get(data['category'], 0)
        points_earned = int(data['weight'] * points_per_kg)

        delivery = DeliveryRecord.objects.create(
            user=request.user,
            bin=bin_obj,
            category=data['category'],
            weight=data['weight'],
            points_earned=points_earned,
            points_per_kg=points_per_kg,
            status=1,
        )

        if points_earned > 0:
            account, _ = PointAccount.objects.get_or_create(user=request.user)
            balance_before = account.balance
            balance_after = balance_before + points_earned

            point_record = PointRecord.objects.create(
                account=account,
                user=request.user,
                type='earn',
                source='delivery',
                points=points_earned,
                balance_before=balance_before,
                balance_after=balance_after,
                related_id=str(delivery.id),
                remark=f'投放{delivery.get_category_display()}{data["weight"]}kg'
            )

            account.balance = balance_after
            account.total_earned += points_earned
            account.save()

            request.user.available_points = balance_after
            request.user.total_points += points_earned
            request.user.save()

            delivery.point_record = point_record
            delivery.save()

        bin_obj.used += data['weight']
        bin_obj.save()

        result_serializer = DeliveryRecordSerializer(delivery)
        return Response({
            'code': 0,
            'message': '投放登记成功',
            'data': result_serializer.data
        })


class DeliveryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            delivery = DeliveryRecord.objects.get(pk=pk)
        except DeliveryRecord.DoesNotExist:
            return Response({
                'code': 404,
                'message': '投递记录不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'resident' and delivery.user_id != request.user.id:
            return Response({
                'code': 403,
                'message': '无权查看此记录',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = DeliveryRecordSerializer(delivery)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': serializer.data
        })

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics, serializers
from django.db import transaction
from django.db import models
from django.utils import timezone
from .models import (
    GreenPassCode, SmartBin, DeliveryRecord, PointAccount, PointRecord,
    POINTS_PER_KG_CONFIG, LEVEL_CONFIG, ExchangeGoods, ExchangeOrder,
    Achievement, UserAchievement, InspectionReport, Notification
)
from .serializers import (
    GreenPassCodeSerializer, PassCodeVerifySerializer,
    SmartBinSerializer, DeliveryRecordSerializer, DeliveryCreateSerializer,
    PointAccountSerializer, PointRecordSerializer, DeliveryAuditSerializer,
    ExchangeGoodsSerializer, ExchangeOrderSerializer, ExchangeCreateSerializer,
    AchievementSerializer, UserAchievementSerializer,
    InspectionReportSerializer, InspectionCreateSerializer, InspectionHandleSerializer,
    NotificationSerializer
)
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

        points_per_kg = PointAccount.get_points_per_kg(data['category'])
        points_earned = int(data['weight'] * points_per_kg)

        delivery = DeliveryRecord.objects.create(
            user=request.user,
            bin=bin_obj,
            category=data['category'],
            weight=data['weight'],
            points_earned=points_earned,
            points_per_kg=points_per_kg,
            status=0,
        )

        bin_obj.used += data['weight']
        bin_obj.save()

        result_serializer = DeliveryRecordSerializer(delivery)
        return Response({
            'code': 0,
            'message': '投放登记成功，等待审核',
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


class DeliveryAuditView(APIView):
    permission_classes = [IsAuthenticated, IsInspector]

    def post(self, request, pk):
        try:
            delivery = DeliveryRecord.objects.get(pk=pk)
        except DeliveryRecord.DoesNotExist:
            return Response({
                'code': 404,
                'message': '投递记录不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = DeliveryAuditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data['action']
        remark = serializer.validated_data.get('remark', '')

        if action == 'approve':
            success, msg = delivery.approve(inspector=request.user, remark=remark)
            if success:
                Notification.objects.create(
                    user=delivery.user,
                    type='delivery_approved',
                    title='投递审核通过',
                    content=f'您投放的{delivery.get_category_display()}{delivery.weight}kg已审核通过，获得{delivery.points_earned}积分',
                    related_id=str(delivery.id),
                    extra={'delivery_id': delivery.id, 'points': delivery.points_earned},
                )
            if not success:
                return Response({
                    'code': 400,
                    'message': msg,
                    'data': None
                })
        elif action == 'reject':
            success, msg = delivery.reject(inspector=request.user, remark=remark or '分类不符合要求')
            if success:
                Notification.objects.create(
                    user=delivery.user,
                    type='delivery_rejected',
                    title='投递审核驳回',
                    content=f'您投放的{delivery.get_category_display()}{delivery.weight}kg未通过审核，原因：{remark or "分类不符合要求"}',
                    related_id=str(delivery.id),
                    extra={'delivery_id': delivery.id},
                )
            if not success:
                return Response({
                    'code': 400,
                    'message': msg,
                    'data': None
                })
        else:
            return Response({
                'code': 400,
                'message': '无效的操作类型',
                'data': None
            })

        result_serializer = DeliveryRecordSerializer(delivery)
        return Response({
            'code': 0,
            'message': msg,
            'data': result_serializer.data
        })


class PointAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        account, _ = PointAccount.objects.get_or_create(user=request.user)
        progress = 0
        if account.next_level_points > account.total_earned:
            diff = account.next_level_points - account.total_earned
            last_level_min = 0
            for cfg in [{'min_points': 0}] + list(LEVEL_CONFIG):
                if account.total_earned >= cfg['min_points']:
                    last_level_min = cfg['min_points']
            range_val = max(account.next_level_points - last_level_min, 1)
            current = account.total_earned - last_level_min
            progress = min(round(current / range_val * 100, 1), 100)
        else:
            progress = 100
        serializer = PointAccountSerializer(account)
        data = serializer.data
        data['level_progress'] = progress
        data['points_config'] = POINTS_PER_KG_CONFIG
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': data
        })


class PointRecordsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PointRecordSerializer

    def get_queryset(self):
        queryset = PointRecord.objects.filter(user=self.request.user)
        type_filter = self.request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(type=type_filter)
        source = self.request.query_params.get('source')
        if source:
            queryset = queryset.filter(source=source)
        return queryset.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        total = queryset.count()
        records = queryset[start:end]
        serializer = self.get_serializer(records, many=True)

        earn_total = queryset.filter(type='earn').aggregate(total=models.Sum('points'))['total'] or 0
        spend_total = abs(queryset.filter(type='spend').aggregate(total=models.Sum('points'))['total'] or 0)

        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': serializer.data,
                'total': total,
                'page': page,
                'page_size': page_size,
                'summary': {
                    'earn_total': earn_total,
                    'spend_total': spend_total,
                    'count': total,
                }
            }
        })


class GoodsListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ExchangeGoodsSerializer

    def get_queryset(self):
        queryset = ExchangeGoods.objects.filter(status=1).order_by('sort', '-created_at')
        type_filter = self.request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(type=type_filter)
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        keyword = self.request.query_params.get('keyword')
        if keyword:
            queryset = queryset.filter(name__icontains=keyword)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        total = queryset.count()
        goods_list = queryset[start:end]
        serializer = self.get_serializer(goods_list, many=True)

        physical_count = ExchangeGoods.objects.filter(status=1, type='physical').count()
        virtual_count = ExchangeGoods.objects.filter(status=1, type='virtual').count()

        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': serializer.data,
                'total': total,
                'page': page,
                'page_size': page_size,
                'stats': {
                    'physical_count': physical_count,
                    'virtual_count': virtual_count,
                }
            }
        })


class GoodsDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            goods = ExchangeGoods.objects.get(pk=pk)
        except ExchangeGoods.DoesNotExist:
            return Response({
                'code': 404,
                'message': '商品不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = ExchangeGoodsSerializer(goods)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': serializer.data
        })


class ExchangeCreateView(APIView):
    permission_classes = [IsAuthenticated, IsResident]

    @transaction.atomic
    def post(self, request):
        serializer = ExchangeCreateSerializer(data=request.data)
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
        goods = data['goods']
        quantity = data.get('quantity', 1)

        receiver_info = None
        if goods.type == 'physical':
            receiver_info = {
                'name': data.get('receiver_name', ''),
                'phone': data.get('receiver_phone', ''),
                'address': data.get('receiver_address', ''),
            }
            if not receiver_info['name'] or not receiver_info['phone'] or not receiver_info['address']:
                return Response({
                    'code': 400,
                    'message': '实物商品请填写完整的收货信息',
                    'data': None
                })

        try:
            order = ExchangeOrder.create_exchange_order(
                user=request.user,
                goods=goods,
                quantity=quantity,
                receiver_info=receiver_info
            )
        except ValueError as e:
            return Response({
                'code': 400,
                'message': str(e),
                'data': None
            })

        Notification.objects.create(
            user=request.user,
            type='exchange_success',
            title='兑换成功',
            content=f'您已成功兑换「{goods.name}」x{quantity}，消耗{order.total_points}积分',
            related_id=str(order.id),
            extra={'order_id': order.id, 'order_no': order.order_no, 'goods_name': goods.name},
        )

        result_serializer = ExchangeOrderSerializer(order)
        return Response({
            'code': 0,
            'message': '兑换成功',
            'data': result_serializer.data
        })


class ExchangeOrderListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ExchangeOrderSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            queryset = ExchangeOrder.objects.all()
        else:
            queryset = ExchangeOrder.objects.filter(user=user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        goods_type = self.request.query_params.get('goods_type')
        if goods_type:
            queryset = queryset.filter(goods_type=goods_type)
        return queryset.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        total = queryset.count()
        orders = queryset[start:end]
        serializer = self.get_serializer(orders, many=True)

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


class ExchangeOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            order = ExchangeOrder.objects.get(pk=pk)
        except ExchangeOrder.DoesNotExist:
            return Response({
                'code': 404,
                'message': '订单不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'resident' and order.user_id != request.user.id:
            return Response({
                'code': 403,
                'message': '无权查看此订单',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = ExchangeOrderSerializer(order)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': serializer.data
        })


class ExchangeOrderCancelView(APIView):
    permission_classes = [IsAuthenticated, IsResident]

    def post(self, request, pk):
        try:
            order = ExchangeOrder.objects.get(pk=pk)
        except ExchangeOrder.DoesNotExist:
            return Response({
                'code': 404,
                'message': '订单不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        if order.user_id != request.user.id:
            return Response({
                'code': 403,
                'message': '无权操作此订单',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)

        success, msg = order.cancel()
        if not success:
            return Response({
                'code': 400,
                'message': msg,
                'data': None
            })

        serializer = ExchangeOrderSerializer(order)
        return Response({
            'code': 0,
            'message': msg,
            'data': serializer.data
        })


class AchievementListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        all_achievements = Achievement.objects.all().order_by('sort', 'id')
        user_achievements = UserAchievement.objects.filter(
            user=request.user
        ).values_list('achievement_id', flat=True)

        serializer = AchievementSerializer(all_achievements, many=True)
        data = []
        for item in serializer.data:
            item['unlocked'] = item['id'] in user_achievements
            data.append(item)

        unlocked_count = len(user_achievements)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': data,
                'total': all_achievements.count(),
                'unlocked_count': unlocked_count,
            }
        })


class UserAchievementListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_achievements = UserAchievement.objects.filter(
            user=request.user
        ).select_related('achievement').order_by('-unlocked_at')

        serializer = UserAchievementSerializer(user_achievements, many=True)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': serializer.data,
                'total': user_achievements.count(),
            }
        })


class CarbonFootprintTimelineView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        deliveries = DeliveryRecord.objects.filter(
            user=user, status=1
        ).order_by('-created_at')

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size
        total = deliveries.count()

        page_deliveries = deliveries[start:end]

        CO2_FACTOR = {
            'recyclable': 0.5,
            'kitchen': 0.3,
            'hazardous': 0.8,
            'other': 0.1,
        }

        timeline = []
        for d in page_deliveries:
            co2 = round(d.weight * CO2_FACTOR.get(d.category, 0.1), 2)
            timeline.append({
                'id': d.id,
                'date': d.created_at.strftime('%Y-%m-%d'),
                'time': d.created_at.strftime('%H:%M'),
                'category': d.category,
                'category_name': d.get_category_display(),
                'weight': d.weight,
                'co2_reduction': co2,
                'points_earned': d.points_earned,
            })

        total_weight = deliveries.aggregate(total=models.Sum('weight'))['total'] or 0
        total_co2 = sum(
            round(d.weight * CO2_FACTOR.get(d.category, 0.1), 2)
            for d in deliveries
        )
        total_points = deliveries.aggregate(total=models.Sum('points_earned'))['total'] or 0

        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': timeline,
                'total': total,
                'page': page,
                'page_size': page_size,
                'summary': {
                    'total_weight': round(total_weight, 2),
                    'total_co2': round(total_co2, 2),
                    'total_points': total_points,
                    'total_deliveries': total,
                    'trees_equivalent': round(total_co2 / 18.0, 1),
                }
            }
        })


class CommunityDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        today_start = timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.min.time())
        )
        today_end = timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.max.time())
        )

        CO2_FACTOR = {
            'recyclable': 0.5,
            'kitchen': 0.3,
            'hazardous': 0.8,
            'other': 0.1,
        }

        today_deliveries = DeliveryRecord.objects.filter(
            status=1, created_at__range=(today_start, today_end)
        )

        today_weight = today_deliveries.aggregate(
            total=models.Sum('weight')
        )['total'] or 0

        today_co2 = 0
        for d in today_deliveries:
            today_co2 += d.weight * CO2_FACTOR.get(d.category, 0.1)

        today_points = today_deliveries.aggregate(
            total=models.Sum('points_earned')
        )['total'] or 0

        today_people = today_deliveries.values('user_id').distinct().count()

        building_ranking = (
            PointAccount.objects
            .filter(user__role='resident')
            .exclude(user__community='')
            .values('user__community')
            .annotate(
                total_points=models.Sum('total_earned'),
                user_count=models.Count('user_id')
            )
            .order_by('-total_points')[:20]
        )

        ranking_list = []
        for idx, item in enumerate(building_ranking, 1):
            ranking_list.append({
                'rank': idx,
                'building': item['user__community'],
                'total_points': item['total_points'],
                'user_count': item['user_count'],
                'avg_points': round(item['total_points'] / max(item['user_count'], 1), 1),
            })

        category_data = {}
        for cat_key, cat_label in DeliveryRecord.CATEGORY_CHOICES:
            cat_weight = today_deliveries.filter(
                category=cat_key
            ).aggregate(total=models.Sum('weight'))['total'] or 0
            category_data[cat_key] = {
                'name': cat_label,
                'weight': round(cat_weight, 2),
                'co2': round(cat_weight * CO2_FACTOR.get(cat_key, 0.1), 2),
            }

        all_deliveries = DeliveryRecord.objects.filter(status=1)
        total_co2_all = sum(
            d.weight * CO2_FACTOR.get(d.category, 0.1) for d in all_deliveries
        )
        total_weight_all = all_deliveries.aggregate(
            total=models.Sum('weight')
        )['total'] or 0

        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'today': {
                    'weight': round(today_weight, 2),
                    'co2_reduction': round(today_co2, 2),
                    'points': today_points,
                    'people': today_people,
                },
                'total': {
                    'weight': round(total_weight_all, 2),
                    'co2_reduction': round(total_co2_all, 2),
                },
                'building_ranking': ranking_list,
                'category_breakdown': category_data,
            }
        })


class InspectionReportListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = InspectionReportSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            queryset = InspectionReport.objects.all()
        elif user.role == 'inspector':
            queryset = InspectionReport.objects.filter(
                models.Q(reporter=user) | models.Q(status__in=[0, 1])
            )
        else:
            queryset = InspectionReport.objects.filter(reporter=user)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        type_filter = self.request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(type=type_filter)
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

        pending_count = InspectionReport.objects.filter(status=0).count()
        processing_count = InspectionReport.objects.filter(status=1).count()
        resolved_count = InspectionReport.objects.filter(status=2).count()

        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': serializer.data,
                'total': total,
                'page': page,
                'page_size': page_size,
                'stats': {
                    'pending_count': pending_count,
                    'processing_count': processing_count,
                    'resolved_count': resolved_count,
                }
            }
        })


class InspectionReportCreateView(APIView):
    permission_classes = [IsAuthenticated, IsInspector]

    @transaction.atomic
    def post(self, request):
        serializer = InspectionCreateSerializer(data=request.data)
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

        report = InspectionReport.objects.create(
            reporter=request.user,
            bin=data.get('bin_obj'),
            delivery=data.get('delivery_obj'),
            type=data['type'],
            description=data['description'],
            images=data.get('images', []),
            location=data.get('location', ''),
        )

        if data.get('delivery_obj') and not data.get('bin_obj'):
            report.bin = data['delivery_obj'].bin
            report.save()

        if report.bin:
            if data['type'] == 'bin_damage':
                report.bin.status = 3
                report.bin.save()
            elif data['type'] in ['bin_full', 'hygiene']:
                report.bin.status = 2
                report.bin.save()

        result_serializer = InspectionReportSerializer(report)
        return Response({
            'code': 0,
            'message': '上报成功，等待管理员处理',
            'data': result_serializer.data
        })


class InspectionReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            report = InspectionReport.objects.get(pk=pk)
        except InspectionReport.DoesNotExist:
            return Response({
                'code': 404,
                'message': '上报记录不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'resident' and report.reporter_id != request.user.id:
            return Response({
                'code': 403,
                'message': '无权查看此记录',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)

        if request.user.role == 'inspector' and report.reporter_id != request.user.id and report.status not in [0, 1]:
            return Response({
                'code': 403,
                'message': '无权查看此记录',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = InspectionReportSerializer(report)
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': serializer.data
        })


class InspectionReportHandleView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            report = InspectionReport.objects.get(pk=pk)
        except InspectionReport.DoesNotExist:
            return Response({
                'code': 404,
                'message': '上报记录不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = InspectionHandleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data['action']
        remark = serializer.validated_data.get('remark', '')
        points_reward = serializer.validated_data.get('points_reward', 0)

        if action == 'start':
            success, msg = report.start_handle(handler=request.user)
        elif action == 'resolve':
            success, msg = report.resolve(handler=request.user, remark=remark, points_reward=points_reward)
            if success:
                Notification.objects.create(
                    user=report.reporter,
                    type='inspection_resolved',
                    title='巡检上报已处理',
                    content=f'您上报的{report.get_type_display()}异常已处理完成{f"，获得{points_reward}积分奖励" if points_reward > 0 else ""}。处理备注：{remark or "无"}',
                    related_id=str(report.id),
                    extra={'report_id': report.id, 'points_reward': points_reward},
                )
        elif action == 'reject':
            success, msg = report.reject(handler=request.user, remark=remark or '异常描述不清晰或证据不足')
            if success:
                Notification.objects.create(
                    user=report.reporter,
                    type='inspection_rejected',
                    title='巡检上报已驳回',
                    content=f'您上报的{report.get_type_display()}异常已被驳回，原因：{remark or "异常描述不清晰或证据不足"}',
                    related_id=str(report.id),
                    extra={'report_id': report.id},
                )
        else:
            return Response({
                'code': 400,
                'message': '无效的操作类型',
                'data': None
            })

        if not success:
            return Response({
                'code': 400,
                'message': msg,
                'data': None
            })

        result_serializer = InspectionReportSerializer(report)
        return Response({
            'code': 0,
            'message': msg,
            'data': result_serializer.data
        })


class NotificationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        type_filter = self.request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(type=type_filter)
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        return queryset.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        total = queryset.count()
        notifications = queryset[start:end]
        serializer = self.get_serializer(notifications, many=True)
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {
                'list': serializer.data,
                'total': total,
                'page': page,
                'page_size': page_size,
                'unread_count': unread_count,
            }
        })


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({
            'code': 0,
            'message': '获取成功',
            'data': {'unread_count': count}
        })


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({
                'code': 404,
                'message': '通知不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save()
        serializer = NotificationSerializer(notification)
        return Response({
            'code': 0,
            'message': '已标为已读',
            'data': serializer.data
        })


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({
            'code': 0,
            'message': f'已将{count}条通知标为已读',
            'data': {'count': count}
        })

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


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

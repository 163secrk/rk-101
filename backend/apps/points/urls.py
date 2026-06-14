from django.urls import path
from .views import (
    HomeView, GeneratePassCodeView, VerifyPassCodeView,
    PassCodeDetailView, MyPassCodesView,
    SmartBinListView, SmartBinCreateView, SmartBinDetailView,
    DeliveryListView, DeliveryCreateView, DeliveryDetailView,
    DeliveryAuditView, PointAccountView, PointRecordsView
)

urlpatterns = [
    path('home/', HomeView.as_view(), name='home'),
    path('passcode/generate/', GeneratePassCodeView.as_view(), name='passcode-generate'),
    path('passcode/verify/', VerifyPassCodeView.as_view(), name='passcode-verify'),
    path('passcode/<uuid:code_id>/', PassCodeDetailView.as_view(), name='passcode-detail'),
    path('passcode/mine/', MyPassCodesView.as_view(), name='passcode-mine'),
    path('bins/', SmartBinListView.as_view(), name='bin-list'),
    path('bins/create/', SmartBinCreateView.as_view(), name='bin-create'),
    path('bins/<int:pk>/', SmartBinDetailView.as_view(), name='bin-detail'),
    path('deliveries/', DeliveryListView.as_view(), name='delivery-list'),
    path('deliveries/create/', DeliveryCreateView.as_view(), name='delivery-create'),
    path('deliveries/<int:pk>/', DeliveryDetailView.as_view(), name='delivery-detail'),
    path('deliveries/<int:pk>/audit/', DeliveryAuditView.as_view(), name='delivery-audit'),
    path('points/account/', PointAccountView.as_view(), name='point-account'),
    path('points/records/', PointRecordsView.as_view(), name='point-records'),
]

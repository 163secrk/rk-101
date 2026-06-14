from django.urls import path
from .views import (
    HomeView, GeneratePassCodeView, VerifyPassCodeView,
    PassCodeDetailView, MyPassCodesView
)

urlpatterns = [
    path('home/', HomeView.as_view(), name='home'),
    path('passcode/generate/', GeneratePassCodeView.as_view(), name='passcode-generate'),
    path('passcode/verify/', VerifyPassCodeView.as_view(), name='passcode-verify'),
    path('passcode/<uuid:code_id>/', PassCodeDetailView.as_view(), name='passcode-detail'),
    path('passcode/mine/', MyPassCodesView.as_view(), name='passcode-mine'),
]

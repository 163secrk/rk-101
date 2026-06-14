from django.urls import path
from .views import (
    RegisterView, LoginView, TokenRefreshWrapView,
    UserProfileView, ChangePasswordView, LogoutView,
    InvitationCodeListView, InvitationCodeDetailView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('refresh/', TokenRefreshWrapView.as_view(), name='token-refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('password/change/', ChangePasswordView.as_view(), name='change-password'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('invitation-codes/', InvitationCodeListView.as_view(), name='invitation-code-list'),
    path('invitation-codes/<int:pk>/', InvitationCodeDetailView.as_view(), name='invitation-code-detail'),
]

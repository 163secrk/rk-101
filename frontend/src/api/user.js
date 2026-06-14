import request from './request'

export const login = (data) => request.post('/users/login/', data)

export const register = (data) => request.post('/users/register/', data)

export const logout = (data) => request.post('/users/logout/', data)

export const getProfile = () => request.get('/users/profile/')

export const updateProfile = (data) => request.put('/users/profile/', data)

export const changePassword = (data) => request.post('/users/password/change/', data)

export const refreshToken = (data) => request.post('/users/refresh/', data)

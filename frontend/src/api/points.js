import request from './request'

export const getHomeData = () => request.get('/points/home/')

export const generatePassCode = (data) => request.post('/points/passcode/generate/', data)

export const verifyPassCode = (data) => request.post('/points/passcode/verify/', data)

export const getPassCodeDetail = (codeId) => request.get(`/points/passcode/${codeId}/`)

export const getMyPassCodes = () => request.get('/points/passcode/mine/')

export const getBinList = (params) => request.get('/points/bins/', { params })

export const getBinDetail = (id) => request.get(`/points/bins/${id}/`)

export const createBin = (data) => request.post('/points/bins/create/', data)

export const updateBin = (id, data) => request.put(`/points/bins/${id}/`, data)

export const deleteBin = (id) => request.delete(`/points/bins/${id}/`)

export const getDeliveryList = (params) => request.get('/points/deliveries/', { params })

export const getDeliveryDetail = (id) => request.get(`/points/deliveries/${id}/`)

export const createDelivery = (data) => request.post('/points/deliveries/create/', data)

export const getPointAccount = () => request.get('/points/points/account/')

export const getPointRecords = (params) => request.get('/points/points/records/', { params })

export const getGoodsList = (params) => request.get('/points/goods/', { params })

export const getGoodsDetail = (id) => request.get(`/points/goods/${id}/`)

export const createExchange = (data) => request.post('/points/exchange/create/', data)

export const getExchangeOrders = (params) => request.get('/points/exchange/orders/', { params })

export const getExchangeOrderDetail = (id) => request.get(`/points/exchange/orders/${id}/`)

export const cancelExchangeOrder = (id) => request.post(`/points/exchange/orders/${id}/cancel/`)

export const getAchievements = () => request.get('/points/achievements/')

export const getUserAchievements = () => request.get('/points/achievements/mine/')

export const getCarbonFootprint = (params) => request.get('/points/carbon-footprint/', { params })

export const getCommunityDashboard = () => request.get('/points/community/dashboard/')

export const getInspectionList = (params) => request.get('/points/inspection/', { params })

export const getInspectionDetail = (id) => request.get(`/points/inspection/${id}/`)

export const createInspection = (data) => request.post('/points/inspection/create/', data)

export const handleInspection = (id, data) => request.post(`/points/inspection/${id}/handle/`, data)

export const getNotifications = (params) => request.get('/points/notifications/', { params })

export const getNotificationUnreadCount = () => request.get('/points/notifications/unread-count/')

export const markNotificationRead = (id) => request.post(`/points/notifications/${id}/read/`)

export const markAllNotificationsRead = () => request.post('/points/notifications/read-all/')

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

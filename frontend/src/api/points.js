import request from './request'

export const getHomeData = () => request.get('/points/home/')

export const generatePassCode = (data) => request.post('/points/passcode/generate/', data)

export const verifyPassCode = (data) => request.post('/points/passcode/verify/', data)

export const getPassCodeDetail = (codeId) => request.get(`/points/passcode/${codeId}/`)

export const getMyPassCodes = () => request.get('/points/passcode/mine/')

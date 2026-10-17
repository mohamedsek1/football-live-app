import axios from 'axios'

const http = axios.create({ baseURL: '/api', timeout: 15000 })

export const getSchedule = (date) =>
  http.get('/get_schedule.php', { params: { date } }).then((r) => r.data)

export const getLive = () => http.get('/get_scores.php', { params: { live: 1 } }).then((r) => r.data)

export const getMatch = (matchId) =>
  http.get('/get_scores.php', { params: { matchId } }).then((r) => r.data)

export const getRatings = (matchId) =>
  http.get('/get_ratings.php', { params: { matchId } }).then((r) => r.data.content.lineup)

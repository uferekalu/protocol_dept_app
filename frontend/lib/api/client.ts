import axios from 'axios';

// Central API client pointed at the NestJS backend. Attach the auth token here once
// the auth module exists (e.g. via an axios request interceptor reading from the
// authSlice / a cookie).
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

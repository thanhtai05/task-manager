import { CustomError } from "@/types/custom-error.type";
import axios from "axios";
import { redirect } from "react-router-dom";

export const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 401) {
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      const isAuthRoute = /^\/(auth|login|register)?$/i.test(window.location.pathname) || /\/auth\//.test(window.location.pathname);
      if (!isAuthRoute) {
        const returnUrl = encodeURIComponent(currentPath);
        window.location.assign(`/${window.location.pathname === "/" ? "" : ""}?returnUrl=${returnUrl}`);
      }
    }

    const message =
      (typeof data === "string" && data) ||
      data?.message ||
      error?.message ||
      "Unexpected error occurred";

    return Promise.reject({
      status,
      message,
      data,
    });
  }
);

export default API;

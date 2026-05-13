import { httpClient } from "../lib/http-client";

export type User = {
  id: string;
  email: string;
  role: "USER" | "INSTRUCTOR" | "ADMIN";
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type PaginatedUsers = {
  items: User[];
  pagination: {
    page: number;
    limit: number;
  };
};

export const userService = {
  async getMe(): Promise<User> {
    const response = await httpClient.get<ApiResponse<User>>("/users/me");
    return response.data.data;
  },

  async getUsers(): Promise<PaginatedUsers> {
    const response = await httpClient.get<ApiResponse<PaginatedUsers>>("/users");
    return response.data.data;
  },
  async createUser(payload: { id: string; email: string; role: "USER" | "INSTRUCTOR" | "ADMIN" }): Promise<User> {
    const response = await httpClient.post<ApiResponse<User>>("/users", payload);
    return response.data.data;
  }
};

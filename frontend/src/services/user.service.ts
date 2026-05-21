import { httpClient } from "../lib/http-client";
import type { UserRole, UserStatus } from "../constants/business";

export type User = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
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
    total: number;
  };
};

export type UserListParams = {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
};

export const userService = {
  async getMe(): Promise<User> {
    const response = await httpClient.get<ApiResponse<User>>("/users/me");
    return response.data.data;
  },

  async getUsers(params: UserListParams = {}): Promise<PaginatedUsers> {
    const response = await httpClient.get<ApiResponse<PaginatedUsers>>("/users", {
      params: {
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
        ...(params.role ? { role: params.role } : {}),
        ...(params.status ? { status: params.status } : {})
      }
    });
    return response.data.data;
  },
  async createUser(payload: { id: string; email: string; role: UserRole }): Promise<User> {
    const response = await httpClient.post<ApiResponse<User>>("/users", payload);
    return response.data.data;
  },
  async updateUser(id: string, payload: { email?: string; role?: UserRole; status?: UserStatus }): Promise<User> {
    const response = await httpClient.put<ApiResponse<User>>(`/users/${id}`, payload);
    return response.data.data;
  }
};

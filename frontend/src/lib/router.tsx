import { createBrowserRouter, Navigate } from "react-router-dom";
import { UsersPage } from "../pages/users-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/users" replace />
  },
  {
    path: "/users",
    element: <UsersPage />
  }
]);

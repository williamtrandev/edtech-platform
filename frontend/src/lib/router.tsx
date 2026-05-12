import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicOnly, RequireAuth } from "../components/route-guards";
import { CourseDetailPage } from "../pages/course-detail-page";
import { CoursesPage } from "../pages/courses-page";
import { LoginPage } from "../pages/login-page";
import { MyProgressPage } from "../pages/my-progress-page";
import { RegisterPage } from "../pages/register-page";
import { UsersPage } from "../pages/users-page";

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      {
        path: "/login",
        element: <LoginPage />
      },
      {
        path: "/register",
        element: <RegisterPage />
      }
    ]
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <Navigate to="/courses" replace />
      },
      {
        path: "/courses",
        element: <CoursesPage />
      },
      {
        path: "/courses/:courseId",
        element: <CourseDetailPage />
      },
      {
        path: "/my-progress",
        element: <MyProgressPage />
      },
      {
        path: "/users",
        element: <UsersPage />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/courses" replace />
  }
]);

import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminUsersGate, CoursesWorkspaceGate, HomeRedirect, PublicOnly, RequireAuth } from "../components/route-guards";
import { AccountSettingsPage } from "../pages/account-settings-page";
import { CourseDetailPage } from "../pages/course-detail-page";
import { CoursesPage } from "../pages/courses-page";
import { ExploreCoursesPage } from "../pages/explore-courses-page";
import { ForgotPasswordPage } from "../pages/forgot-password-page";
import { LoginPage } from "../pages/login-page";
import { MyLearningPage } from "../pages/my-learning-page";
import { MyProgressPage } from "../pages/my-progress-page";
import { RegisterPage } from "../pages/register-page";
import { ResetPasswordPage } from "../pages/reset-password-page";
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
    path: "/forgot-password",
    element: <ForgotPasswordPage />
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />
  },
  {
    path: "/",
    element: <HomeRedirect />
  },
  {
    path: "/explore",
    element: <ExploreCoursesPage />
  },
  {
    path: "/courses/:courseId",
    element: <CourseDetailPage />
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/dashboard",
        element: <MyLearningPage />
      },
      {
        path: "/my-progress",
        element: <MyProgressPage />
      },
      {
        path: "/settings",
        element: <AccountSettingsPage />
      },
      {
        path: "/account",
        element: <Navigate to="/settings" replace />
      },
      {
        path: "/profile",
        element: <Navigate to="/settings" replace />
      },
      {
        path: "/courses",
        element: <CoursesWorkspaceGate />,
        children: [
          {
            index: true,
            element: <CoursesPage />
          }
        ]
      },
      {
        path: "/users",
        element: <AdminUsersGate />,
        children: [
          {
            index: true,
            element: <UsersPage />
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);

import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminUsersGate, CoursesWorkspaceGate, HomeRedirect, InstructorCreateCourseGate, LearnerWorkspaceGate, PublicOnly, RequireAuth } from "../components/route-guards";
import { AccountSettingsPage } from "../pages/account-settings-page";
import { AuditLogsPage } from "../pages/audit-logs-page";
import { CertificateVerifyPage } from "../pages/certificate-verify-page";
import { CourseCreatePage } from "../pages/course-create-page";
import { CourseDetailPage } from "../pages/course-detail-page";
import { CourseLearnPage } from "../pages/course-learn-page";
import { CoursesPage } from "../pages/courses-page";
import { EmailConfirmedPage } from "../pages/email-confirmed-page";
import { ExploreCoursesPage } from "../pages/explore-courses-page";
import { LearningPathDetailPage } from "../pages/learning-path-detail-page";
import { LearningPathsPage } from "../pages/learning-paths-page";
import { ForgotPasswordPage } from "../pages/forgot-password-page";
import { JobsPage } from "../pages/jobs-page";
import { LoginPage } from "../pages/login-page";
import { MyLearningPage } from "../pages/my-learning-page";
import { MyProgressPage } from "../pages/my-progress-page";
import { NotFoundPage } from "../pages/not-found-page";
import { PlatformAnalyticsPage } from "../pages/platform-analytics-page";
import { RegisterPage } from "../pages/register-page";
import { ResetPasswordPage } from "../pages/reset-password-page";
import { UserDetailPage } from "../pages/user-detail-page";
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
    path: "/email-confirmed",
    element: <EmailConfirmedPage />
  },
  {
    path: "/certificates/verify/:verificationCode",
    element: <CertificateVerifyPage />
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
    path: "/learning-paths",
    element: <LearningPathsPage />
  },
  {
    path: "/learning-paths/:pathId",
    element: <LearningPathDetailPage />
  },
  {
    path: "/courses/:courseId",
    element: <CourseDetailPage />
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/courses/:courseId/learn",
        element: <CourseLearnPage />
      },
      {
        path: "/courses/:courseId/learn/:lessonId",
        element: <CourseLearnPage />
      },
      {
        path: "/courses/:courseId/preview",
        element: <CourseLearnPage />
      },
      {
        path: "/courses/:courseId/preview/:lessonId",
        element: <CourseLearnPage />
      },
      {
        path: "/dashboard",
        element: <LearnerWorkspaceGate />,
        children: [
          {
            index: true,
            element: <MyLearningPage />
          }
        ]
      },
      {
        path: "/my-progress",
        element: <LearnerWorkspaceGate />,
        children: [
          {
            index: true,
            element: <MyProgressPage />
          }
        ]
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
          },
          {
            path: "new",
            element: <InstructorCreateCourseGate />,
            children: [
              {
                index: true,
                element: <CourseCreatePage />
              }
            ]
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
          },
          {
            path: ":userId",
            element: <UserDetailPage />
          }
        ]
      },
      {
        path: "/audit",
        element: <AdminUsersGate />,
        children: [
          {
            index: true,
            element: <AuditLogsPage />
          }
        ]
      },
      {
        path: "/analytics",
        element: <AdminUsersGate />,
        children: [
          {
            index: true,
            element: <PlatformAnalyticsPage />
          }
        ]
      },
      {
        path: "/jobs",
        element: <AdminUsersGate />,
        children: [
          {
            index: true,
            element: <JobsPage />
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);

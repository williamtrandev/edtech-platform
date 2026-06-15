export function getCourseLearnPath(courseId: string, lessonId?: string) {
  if (lessonId) {
    return `/courses/${courseId}/learn/${lessonId}`;
  }

  return `/courses/${courseId}/learn`;
}

export function getCourseReviewLearnPath(courseId: string, lessonId?: string) {
  const basePath = getCourseLearnPath(courseId, lessonId);
  return `${basePath}?review=1`;
}

export function getCoursePreviewPath(courseId: string, lessonId?: string) {
  if (lessonId) {
    return `/courses/${courseId}/preview/${lessonId}`;
  }

  return `/courses/${courseId}/preview`;
}

export function isCoursePreviewPath(pathname: string) {
  return pathname.includes("/preview");
}

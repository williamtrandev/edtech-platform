import type { IAllProps } from "@tinymce/tinymce-react";

type LessonTinyMceInit = NonNullable<IAllProps["init"]>;

/** Plugins available on Tiny Cloud free tier (aligned with official React demo). */
const LESSON_PLUGINS = [
  "advlist",
  "autolink",
  "lists",
  "link",
  "image",
  "charmap",
  "anchor",
  "searchreplace",
  "visualblocks",
  "insertdatetime",
  "media",
  "table",
  "wordcount"
];

/**
 * Toolbar layout close to https://www.tiny.cloud live demo:
 * undo/redo | blocks | styles | alignment | lists | insert | removeformat
 */
const LESSON_TOOLBAR =
  "undo redo | blocks fontsize | bold italic underline strikethrough forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist checklist | outdent indent | link image table blockquote | removeformat";

const CONTENT_STYLE_LIGHT =
  'html { background: #ffffff; } body { background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #262626; margin: 16px; } body[data-mce-placeholder]:not(.mce-visualblocks)::before { color: #737373 !important; opacity: 1 !important; } a { color: #262626; text-decoration: underline; } img { max-width: 100%; height: auto; }';

const CONTENT_STYLE_DARK =
  'html { background: #262626; } body { background: #262626; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #fafafa; margin: 16px; } body[data-mce-placeholder]:not(.mce-visualblocks)::before { color: #d4d4d4 !important; opacity: 1 !important; } a { color: #fafafa; text-decoration: underline; } img { max-width: 100%; height: auto; }';

export function createLessonTinyMceInit(placeholder: string, isDark: boolean): LessonTinyMceInit {
  return {
    height: 520,
    min_height: 520,
    placeholder,
    menubar: false,
    statusbar: true,
    elementpath: false,
    branding: false,
    promotion: false,
    plugins: LESSON_PLUGINS.join(" "),
    toolbar: LESSON_TOOLBAR,
    toolbar_mode: "wrap",
    toolbar_sticky: false,
    block_formats: "Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4",
    fontsize_formats: "12px 14px 16px 18px 20px 24px 28px 32px",
    skin: isDark ? "oxide-dark" : "oxide",
    content_css: isDark ? "dark" : "default",
    content_style: isDark ? CONTENT_STYLE_DARK : CONTENT_STYLE_LIGHT,
    resize: true,
    link_default_target: "_blank",
    link_assume_external_targets: true,
    table_grid: true,
    table_appearance_options: true,
    table_advtab: false,
    automatic_uploads: true,
    file_picker_types: "image",
    image_advtab: false,
    image_caption: true,
    image_description: false,
    image_dimensions: false,
    image_title: false,
    image_uploadtab: true,
    images_file_types: "jpeg,jpg,png,gif,webp",
    paste_data_images: true
  };
}

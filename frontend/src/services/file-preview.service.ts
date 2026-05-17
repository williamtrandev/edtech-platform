export const filePreviewService = {
  async getTextPreview(url: string, signal?: AbortSignal) {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Could not load preview (${response.status})`);
    }

    return response.text();
  }
};

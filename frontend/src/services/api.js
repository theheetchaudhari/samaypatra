const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function extractText(text) {
  try {
    const response = await fetch(`${API_BASE_URL}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export async function requestUploadUrl(fileName, contentType) {
  try {
    const response = await fetch(`${API_BASE_URL}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileName, contentType }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get upload URL (status ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('requestUploadUrl Error:', error);
    throw error;
  }
}

export async function uploadFileToS3(uploadUrl, file) {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed with status ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('uploadFileToS3 Error:', error);
    throw error;
  }
}


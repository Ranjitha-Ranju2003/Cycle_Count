const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://cycle-count.onrender.com/api";

const handleResponse = async (responsePromise) => {
  const response = await responsePromise;

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");
    let errorMessage = "";

    if (rawBody) {
      try {
        const parsedBody = JSON.parse(rawBody);
        errorMessage = parsedBody.message || "";
      } catch (_error) {
        errorMessage = rawBody;
      }
    }

    throw new Error(errorMessage || "Something went wrong");
  }

  return response;
};

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
};

export const fetchInventory = async () => {
  const response = await handleResponse(fetch(`${API_BASE_URL}/inventory`));
  return parseJsonSafely(response);
};

export const uploadExcel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await handleResponse(
    fetch(`${API_BASE_URL}/upload-excel`, {
      method: "POST",
      body: formData,
    })
  );

  return parseJsonSafely(response);
};

export const scanInventoryItem = async ({ batchNumber, stockNumber }) => {
  const response = await handleResponse(
    fetch(`${API_BASE_URL}/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchNumber, stockNumber }),
    })
  );

  return parseJsonSafely(response);
};

export const resetInventory = async () => {
  const response = await handleResponse(
    fetch(`${API_BASE_URL}/reset`, {
      method: "POST",
    })
  );

  return parseJsonSafely(response);
};

export const adjustScannedQuantity = async (id, delta) => {
  const response = await handleResponse(
    fetch(`${API_BASE_URL}/inventory/${id}/adjust`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ delta }),
    })
  );

  return parseJsonSafely(response);
};

export const downloadExport = async () => {
  const response = await handleResponse(fetch(`${API_BASE_URL}/export-excel`));
  return response.blob();
};

export const loginUser = async (credentials) => {
  const response = await handleResponse(
    fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })
  );

  return parseJsonSafely(response);
};

export const signupUser = async (payload) => {
  const response = await handleResponse(
    fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  );

  return parseJsonSafely(response);
};

export const forgotPassword = async (payload) => {
  const response = await handleResponse(
    fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  );

  return parseJsonSafely(response);
};

export const updateUserProfile = async (id, payload) => {
  const response = await handleResponse(
    fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  );

  return parseJsonSafely(response);
};

export const deleteUserProfile = async (id) => {
  const response = await handleResponse(
    fetch(`${API_BASE_URL}/users/${id}`, {
      method: "DELETE",
    })
  );

  return parseJsonSafely(response);
};

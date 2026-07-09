export const sendSuccess = (res, data = null, message = "Success", statusCode = 200) => {
  const response = {
    meta: {
      code: statusCode,
      message,
    },
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

export const sendError = (res, message = "Internal Server Error", statusCode = 500, error = null) => {
  const response = {
    meta: {
      code: statusCode,
      message,
    },
  };

  if (error && process.env.NODE_ENV === "DEVELOPMENT") {
    response.error = error.message || error;
  }

  return res.status(statusCode).json(response);
};

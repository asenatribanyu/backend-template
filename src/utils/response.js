export const sendSuccess = (res, data = null, message = "Success", statusCode = 200, pagination = null) => {
  const response = {
    meta: {
      code: statusCode,
      message,
    },
  };

  if (pagination) {
    response.pagination = pagination;
  }

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

export const sendError = (res, message = "Internal Server Error", statusCode = 500, error = null, errors = null) => {
  const response = {
    meta: {
      code: statusCode,
      message,
    },
  };

  if (errors) {
    response.errors = errors;
  }

  if (error && process.env.NODE_ENV === "DEVELOPMENT") {
    response.error = error.message || error;
  }

  return res.status(statusCode).json(response);
};

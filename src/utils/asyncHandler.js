/**
 * A higher-order function that wraps an asynchronous request handler
 * to catch any errors and pass them to the 'next' middleware (our error handler).
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
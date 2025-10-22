export function notFound(req, res, next) {
  res.status(404).json({ error: true, message: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error("Error:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: true,
    message: err.message || "Internal Server Error",
  });
}

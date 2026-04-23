const ok = (res, data, meta) =>
  res.status(200).json({ success: true, data, ...(meta && { meta }) });

const created = (res, data) =>
  res.status(201).json({ success: true, data });

const badRequest = (res, message, errors) =>
  res.status(400).json({ success: false, message, ...(errors && { errors }) });

const notFound = (res, message = "Not found") =>
  res.status(404).json({ success: false, message });

const serverError = (res, err) => {
  console.error(err);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

module.exports = { ok, created, badRequest, notFound, serverError };

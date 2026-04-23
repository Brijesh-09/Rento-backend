const { badRequest } = require("../lib/response");

const validate = (schema, target = "body") => (req, res, next) => {
  const result = schema.safeParse(req[target]);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return badRequest(res, "Validation failed", errors);
  }

  req[target] = result.data;
  next();
};

module.exports = { validate };

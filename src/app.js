const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");

const categoryRoutes = require("./routes/category.routes");
const productRoutes  = require("./routes/product.routes");
const userRoutes     = require("./routes/user.routes");
const quoteRoutes    = require("./routes/quote.routes");
const seedRoutes     = require("./routes/seed.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/categories", categoryRoutes);
app.use("/api/products",   productRoutes);
app.use("/api/users",      userRoutes);
app.use("/api/quotes",     quoteRoutes);
app.use("/api/seed",       seedRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

module.exports = app;

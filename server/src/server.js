import express from "express";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";

import productsRoute from "./routes/products.js";
import variantsRoute from "./routes/variants.js";
import restocksRoute from "./routes/restocks.js";
import invoicesRoute from "./routes/invoices.js";
import searchRoute from "./routes/search.js";
import reportsRoute from "./routes/reports.js";
import returnsRoute from "./routes/returns.js";
// IMPORTANT: mount your existing customers route
import customersRoute from "./routes/customers.js";
import duesRoutes from "./routes/dues.js"; // NEW
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Mount all routes under /api
app.use("/api", productsRoute);
app.use("/api", variantsRoute);
app.use("/api", restocksRoute);
app.use("/api", invoicesRoute);
app.use("/api", searchRoute);
app.use("/api", reportsRoute);
app.use("/api", returnsRoute);
app.use("/api", customersRoute);
app.use("/api/dues", duesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes); // <-- this fixes 404 for /api/customers/search

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: true, message: err.message });
});

export default app;

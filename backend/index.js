require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rootRouter = require("./routes/index");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", rootRouter);

app.use((err, req, res, next) => {
  res.status(500).json({
    message: "something went wrong",
  });
});

app.listen(process.env.PORT || 3000);

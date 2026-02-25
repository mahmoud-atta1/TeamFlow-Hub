const authRoute = require("./auth.routes");
const userRoute = require("./user.routes");
const teamRoute = require("./team.routes");
const taskRoute = require("./task.routes");
const dashboardRoute = require("./dashboard.routes");
const notificationRoute = require("./notification.routes");

const mountRoutes = (app) => {
  app.use("/api/v1/auth", authRoute);
  app.use("/api/v1/users", userRoute);
  app.use("/api/v1/teams", teamRoute);
  app.use("/api/v1/tasks", taskRoute);
  app.use("/api/v1/notifications", notificationRoute);
  app.use("/api/v1/dashboard", dashboardRoute);
};

module.exports = mountRoutes;

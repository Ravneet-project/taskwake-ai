
const serverless = require("serverless-http");
const app = require("../../server");

exports.handler = async (event, context) => {
  const prefix = "/.netlify/functions/api";

  const path = event.path || "/";

  const normalizedPath = path.startsWith(prefix)
    ? path.slice(prefix.length) || "/"
    : path;

  return serverless(app)({
    ...event,
    path: normalizedPath,
  }, context);
};

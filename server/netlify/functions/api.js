
const serverless = require("serverless-http");
const app = require("../../server");

exports.handler = serverless(app, {
  request: (request, event) => {
    request.url = event.path.replace(
      /^\/\.netlify\/functions\/api/,
      ""
    ) || "/";
  },
});
